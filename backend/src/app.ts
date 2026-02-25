/**
 * SSS Backend: mint/burn + compliance REST API and health check.
 * Run from repo root so IDL path (target/idl) and SDK (file:../sdk) resolve.
 * Env: RPC_URL, KEYPAIR_PATH (or KEYPAIR_JSON base64), MINT_ADDRESS (optional default), PORT.
 */
import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { SolanaStablecoin, SSSComplianceModule } from "@stbr/sss-token";

const PORT = parseInt(process.env.PORT || "3000", 10);
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8899";
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || path.join(process.env.HOME || "", ".config/solana/id.json");
const DEFAULT_MINT = process.env.MINT_ADDRESS || "";

const PROGRAM_IDS = {
  stablecoin: process.env.STABLECOIN_PROGRAM_ID || "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM",
  transferHook: process.env.TRANSFER_HOOK_PROGRAM_ID || "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi",
};

const auditLog: Array<{ time: string; event: string; payload: Record<string, unknown> }> = [];

function loadKeypair(): Keypair {
  if (process.env.KEYPAIR_JSON) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Buffer.from(process.env.KEYPAIR_JSON, "base64").toString("utf-8"))));
  }
  const resolved = KEYPAIR_PATH.startsWith("~")
    ? path.join(process.env.HOME || "", KEYPAIR_PATH.slice(1))
    : path.resolve(KEYPAIR_PATH);
  const buf = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(buf));
}

function getPrograms(connection: Connection, wallet: Wallet): { stablecoinProgram: Program<any>; transferHookProgram: Program<any> | null } {
  const repoRoot = process.env.WORKSPACE_ROOT || process.cwd();
  const stablecoinIdlPath = path.join(repoRoot, "target", "idl", "stablecoin.json");
  const transferHookIdlPath = path.join(repoRoot, "target", "idl", "transfer_hook.json");
  if (!fs.existsSync(stablecoinIdlPath)) {
    throw new Error(`IDL not found at ${stablecoinIdlPath}. Set WORKSPACE_ROOT or run from repo root.`);
  }
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const stablecoinIdl = JSON.parse(fs.readFileSync(stablecoinIdlPath, "utf-8"));
  (stablecoinIdl as any).address = PROGRAM_IDS.stablecoin;
  const stablecoinProgram = new Program(stablecoinIdl, provider);
  let transferHookProgram: Program<any> | null = null;
  if (fs.existsSync(transferHookIdlPath)) {
    const transferHookIdl = JSON.parse(fs.readFileSync(transferHookIdlPath, "utf-8"));
    (transferHookIdl as any).address = PROGRAM_IDS.transferHook;
    transferHookProgram = new Program(transferHookIdl, provider);
  }
  return { stablecoinProgram, transferHookProgram };
}

function getSdk(mint: PublicKey) {
  const connection = new Connection(RPC_URL);
  const keypair = loadKeypair();
  const wallet = new Wallet(keypair);
  const { stablecoinProgram, transferHookProgram } = getPrograms(connection, wallet);
  return new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
}

function logAudit(event: string, payload: Record<string, unknown>) {
  auditLog.push({ time: new Date().toISOString(), event, payload });
  if (auditLog.length > 10000) auditLog.shift();
}

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  try {
    const connection = new Connection(RPC_URL);
    connection.getSlot().then(
      () => res.status(200).json({ ok: true, rpc: RPC_URL }),
      (err) => res.status(503).json({ ok: false, error: String(err) })
    );
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});

app.post("/mint", async (req: Request, res: Response) => {
  try {
    const { mint: mintStr, recipient, amount } = req.body as { mint?: string; recipient: string; amount: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const recipientPubkey = new PublicKey(recipient);
    const keypair = loadKeypair();
    const sdk = getSdk(mint);
    const config = await sdk.getConfig();
    if (config.isPaused) return res.status(400).json({ error: "Program is paused" });
    const tx = await sdk.mint(keypair.publicKey, recipientPubkey, amount);
    const sig = await tx.rpc();
    logAudit("mint", { mint: mint.toBase58(), recipient, amount, signature: sig });
    res.json({ signature: sig });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/burn", async (req: Request, res: Response) => {
  try {
    const { mint: mintStr, amount, from: fromStr } = req.body as { mint?: string; amount: string; from?: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const keypair = loadKeypair();
    const from = fromStr ? new PublicKey(fromStr) : keypair.publicKey;
    const sdk = getSdk(mint);
    const config = await sdk.getConfig();
    if (config.isPaused) return res.status(400).json({ error: "Program is paused" });
    const tx = await sdk.burn(keypair.publicKey, from, amount);
    const sig = await tx.rpc();
    logAudit("burn", { mint: mint.toBase58(), amount, from: from.toBase58(), signature: sig });
    res.json({ signature: sig });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/blacklist/add", async (req: Request, res: Response) => {
  try {
    const { mint: mintStr, address: addressStr, reason } = req.body as { mint?: string; address: string; reason?: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const address = new PublicKey(addressStr);
    const keypair = loadKeypair();
    const sdk = getSdk(mint);
    const compliance = new SSSComplianceModule(sdk);
    const tx = await compliance.addToBlacklist(keypair.publicKey, address);
    const sig = await tx.rpc();
    logAudit("blacklist_add", { mint: mint.toBase58(), address: addressStr, reason, signature: sig });
    res.json({ signature: sig });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/blacklist/remove", async (req: Request, res: Response) => {
  try {
    const { mint: mintStr, address: addressStr } = req.body as { mint?: string; address: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const address = new PublicKey(addressStr);
    const keypair = loadKeypair();
    const sdk = getSdk(mint);
    const compliance = new SSSComplianceModule(sdk);
    const tx = await compliance.removeFromBlacklist(keypair.publicKey, address);
    const sig = await tx.rpc();
    logAudit("blacklist_remove", { mint: mint.toBase58(), address: addressStr, signature: sig });
    res.json({ signature: sig });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/seize", async (req: Request, res: Response) => {
  try {
    const { mint: mintStr, from: fromStr, treasury: treasuryStr, amount: amountStr } = req.body as {
      mint?: string;
      from: string;
      treasury: string;
      amount?: string;
    };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const from = new PublicKey(fromStr);
    const treasury = new PublicKey(treasuryStr);
    const amount = amountStr || "0";
    const keypair = loadKeypair();
    const sdk = getSdk(mint);
    const compliance = new SSSComplianceModule(sdk);
    const tx = await compliance.seize(keypair.publicKey, from, treasury, amount);
    const sig = await tx.rpc();
    logAudit("seize", { mint: mint.toBase58(), from: fromStr, treasury: treasuryStr, amount, signature: sig });
    res.json({ signature: sig });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.get("/audit", (_req: Request, res: Response) => {
  res.json({ events: auditLog });
});

const server = app.listen(PORT, () => {
  console.log(`SSS backend listening on port ${PORT}; RPC=${RPC_URL}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

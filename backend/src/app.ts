/**
 * SSS Backend: mint/burn + compliance REST API, health check, indexer, and audit.
 * Run from repo root so IDL path (target/idl) and SDK (file:../sdk) resolve.
 * Env: RPC_URL, KEYPAIR_PATH (or KEYPAIR_JSON base64), MINT_ADDRESS (optional default), PORT,
 * INDEXER_ENABLED, INDEXER_POLL_MS.
 */
import express, { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getEvents, loadEvents, startIndexer } from "./events";
import { dispatchWebhook } from "./webhook";
import { createLogger, log } from "./logger";
import { screenAddress } from "./screening";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { SolanaStablecoin, SSSComplianceModule } from "@stbr/sss-token";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const PORT = parseInt(process.env.PORT || "3000", 10);
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
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
  log.info("audit", { event, ...payload });
}

async function getSlotForSignature(signature: string): Promise<number | undefined> {
  try {
    const conn = new Connection(RPC_URL);
    const status = await conn.getSignatureStatus(signature);
    return status?.context?.slot as number | undefined;
  } catch {
    return undefined;
  }
}

const app = express();
app.use(express.json());

app.use((req: Request, _res, next) => {
  req.requestId = (req.headers["x-request-id"] as string) || generateRequestId();
  (req as Request & { log: ReturnType<typeof createLogger> }).log = createLogger(req.requestId);
  next();
});

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

app.post("/screen", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
  try {
    const { address: addressStr, mint: mintStr } = req.body as { address: string; mint: string };
    if (!addressStr || !mintStr) return res.status(400).json({ error: "address and mint required" });
    const mint = new PublicKey(mintStr);
    const address = new PublicKey(addressStr);
    const sdk = getSdk(mint);
    const result = await screenAddress(sdk, address);
    res.json(result);
  } catch (e: any) {
    logger.error(e?.message || String(e), { path: "/screen" });
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.get("/screen", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
  try {
    const addressStr = req.query.address as string;
    const mintStr = req.query.mint as string;
    if (!addressStr || !mintStr) return res.status(400).json({ error: "query params address and mint required" });
    const mint = new PublicKey(mintStr);
    const address = new PublicKey(addressStr);
    const sdk = getSdk(mint);
    const result = await screenAddress(sdk, address);
    res.json(result);
  } catch (e: any) {
    logger.error(e?.message || String(e), { path: "/screen" });
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/mint", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
  try {
    const { mint: mintStr, recipient, amount } = req.body as { mint?: string; recipient: string; amount: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const recipientPubkey = new PublicKey(recipient);
    const keypair = loadKeypair();
    const sdk = getSdk(mint);
    const config = await sdk.getConfig();
    if (config.isPaused) return res.status(400).json({ error: "Program is paused" });
    const screening = await screenAddress(sdk, recipientPubkey);
    if (!screening.allowed) return res.status(403).json({ error: screening.reason || "Screening failed" });
    const tx = await sdk.mint(keypair.publicKey, recipientPubkey, amount);
    const sig = await tx.rpc();
    logAudit("mint", { mint: mint.toBase58(), recipient, amount, signature: sig });
    const slot = await getSlotForSignature(sig);
    dispatchWebhook("mint", { event: "mint", mint: mint.toBase58(), signature: sig, slot, recipient, amount });
    res.json({ signature: sig });
  } catch (e: any) {
    logger.error(e?.message || String(e), { mint: (req.body as any)?.mint, recipient: (req.body as any)?.recipient });
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/burn", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
  try {
    const { mint: mintStr, amount, from: fromStr } = req.body as { mint?: string; amount: string; from?: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const keypair = loadKeypair();
    const from = fromStr ? new PublicKey(fromStr) : keypair.publicKey;
    const sdk = getSdk(mint);
    const config = await sdk.getConfig();
    if (config.isPaused) return res.status(400).json({ error: "Program is paused" });
    const screening = await screenAddress(sdk, from);
    if (!screening.allowed) return res.status(403).json({ error: screening.reason || "Screening failed" });
    const tx = await sdk.burn(keypair.publicKey, from, amount);
    const sig = await tx.rpc();
    logAudit("burn", { mint: mint.toBase58(), amount, from: from.toBase58(), signature: sig });
    const slot = await getSlotForSignature(sig);
    dispatchWebhook("burn", { event: "burn", mint: mint.toBase58(), signature: sig, slot, amount, from: from.toBase58() });
    res.json({ signature: sig });
  } catch (e: any) {
    logger.error(e?.message || String(e), { mint: (req.body as any)?.mint, from: (req.body as any)?.from });
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/blacklist/add", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
  try {
    const { mint: mintStr, address: addressStr, reason } = req.body as { mint?: string; address: string; reason?: string };
    const mint = new PublicKey(mintStr || DEFAULT_MINT);
    const address = new PublicKey(addressStr);
    const keypair = loadKeypair();
    const sdk = getSdk(mint);
    const compliance = new SSSComplianceModule(sdk);
    const tx = await compliance.addToBlacklist(keypair.publicKey, address, reason);
    const sig = await tx.rpc();
    logAudit("blacklist_add", { mint: mint.toBase58(), address: addressStr, reason, signature: sig });
    const slot = await getSlotForSignature(sig);
    dispatchWebhook("blacklist_add", { event: "blacklist_add", mint: mint.toBase58(), signature: sig, slot, address: addressStr, reason });
    res.json({ signature: sig });
  } catch (e: any) {
    logger.error(e?.message || String(e), { address: (req.body as any)?.address });
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/blacklist/remove", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
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
    const slot = await getSlotForSignature(sig);
    dispatchWebhook("blacklist_remove", { event: "blacklist_remove", mint: mint.toBase58(), signature: sig, slot, address: addressStr });
    res.json({ signature: sig });
  } catch (e: any) {
    logger.error(e?.message || String(e), { address: (req.body as any)?.address });
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.post("/seize", async (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
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
    const slot = await getSlotForSignature(sig);
    dispatchWebhook("seize", { event: "seize", mint: mint.toBase58(), signature: sig, slot, from: fromStr, treasury: treasuryStr, amount });
    res.json({ signature: sig });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

app.get("/audit", (_req: Request, res: Response) => {
  res.json({ events: auditLog });
});

app.get("/audit/export", (req: Request, res: Response) => {
  const format = (req.query.format as string)?.toLowerCase() || "json";
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  if (format === "csv") {
    const header = "time,event,mint,signature,recipient,amount,from,address,reason,treasury\n";
    const esc = (v: unknown) => (v != null ? String(v).replace(/"/g, '""') : "");
    const rows = auditLog.map((e) => {
      const p = e.payload as Record<string, unknown>;
      return `"${e.time}","${e.event}","${esc(p?.mint)}","${esc(p?.signature)}","${esc(p?.recipient)}","${esc(p?.amount)}","${esc(p?.from)}","${esc(p?.address)}","${esc(p?.reason)}","${esc(p?.treasury)}"`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-${ts}.csv"`);
    res.send(header + rows.join("\n"));
  } else {
    res.setHeader("Content-Disposition", `attachment; filename="audit-${ts}.json"`);
    res.json(auditLog);
  }
});

app.get("/events", (req: Request, res: Response) => {
  const logger = (req as Request & { log: ReturnType<typeof createLogger> }).log;
  try {
    loadEvents();
    const mint = typeof req.query.mint === "string" ? req.query.mint : undefined;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;
    const before = typeof req.query.before === "string" ? req.query.before : undefined;
    const list = getEvents({ mint, limit: isNaN(limit) ? 50 : limit, before });
    res.json({ events: list });
  } catch (e: any) {
    logger.error(e?.message || String(e));
    res.status(500).json({ error: e?.message || String(e) });
  }
});

const server = app.listen(PORT, () => {
  log.info(`SSS backend listening on port ${PORT}; RPC=${RPC_URL}`);
  const indexerEnabled = process.env.INDEXER_ENABLED === "true" || process.env.INDEXER_ENABLED === "1";
  if (indexerEnabled) {
    const conn = new Connection(RPC_URL);
    const programId = new PublicKey(PROGRAM_IDS.stablecoin);
    const pollMs = parseInt(process.env.INDEXER_POLL_MS || "8000", 10);
    startIndexer(conn, programId, isNaN(pollMs) ? 8000 : pollMs);
    log.info(`Indexer started (poll ${pollMs}ms)`);
  }
});

server.on("error", (err) => {
  log.error("Server error", { error: String(err) });
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * SSS Backend: mint/burn + compliance REST API and health check.
 * Run from repo root so IDL path (target/idl) and SDK (file:../sdk) resolve.
 * Env: RPC_URL, KEYPAIR_PATH (or KEYPAIR_JSON base64), MINT_ADDRESS (optional default), PORT.
 */
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const sss_token_1 = require("@stbr/sss-token");
const PORT = parseInt(process.env.PORT || "3000", 10);
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8899";
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || path.join(process.env.HOME || "", ".config/solana/id.json");
const DEFAULT_MINT = process.env.MINT_ADDRESS || "";
const PROGRAM_IDS = {
    stablecoin: process.env.STABLECOIN_PROGRAM_ID || "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM",
    transferHook: process.env.TRANSFER_HOOK_PROGRAM_ID || "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi",
};
const auditLog = [];
function loadKeypair() {
    if (process.env.KEYPAIR_JSON) {
        return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(Buffer.from(process.env.KEYPAIR_JSON, "base64").toString("utf-8"))));
    }
    const resolved = KEYPAIR_PATH.startsWith("~")
        ? path.join(process.env.HOME || "", KEYPAIR_PATH.slice(1))
        : path.resolve(KEYPAIR_PATH);
    const buf = JSON.parse(fs.readFileSync(resolved, "utf-8"));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(buf));
}
function getPrograms(connection, wallet) {
    const repoRoot = process.env.WORKSPACE_ROOT || process.cwd();
    const stablecoinIdlPath = path.join(repoRoot, "target", "idl", "stablecoin.json");
    const transferHookIdlPath = path.join(repoRoot, "target", "idl", "transfer_hook.json");
    if (!fs.existsSync(stablecoinIdlPath)) {
        throw new Error(`IDL not found at ${stablecoinIdlPath}. Set WORKSPACE_ROOT or run from repo root.`);
    }
    const provider = new anchor_1.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const stablecoinIdl = JSON.parse(fs.readFileSync(stablecoinIdlPath, "utf-8"));
    stablecoinIdl.address = PROGRAM_IDS.stablecoin;
    const stablecoinProgram = new anchor_1.Program(stablecoinIdl, provider);
    let transferHookProgram = null;
    if (fs.existsSync(transferHookIdlPath)) {
        const transferHookIdl = JSON.parse(fs.readFileSync(transferHookIdlPath, "utf-8"));
        transferHookIdl.address = PROGRAM_IDS.transferHook;
        transferHookProgram = new anchor_1.Program(transferHookIdl, provider);
    }
    return { stablecoinProgram, transferHookProgram };
}
function getSdk(mint) {
    const connection = new web3_js_1.Connection(RPC_URL);
    const keypair = loadKeypair();
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = getPrograms(connection, wallet);
    return new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
}
function logAudit(event, payload) {
    auditLog.push({ time: new Date().toISOString(), event, payload });
    if (auditLog.length > 10000)
        auditLog.shift();
}
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    try {
        const connection = new web3_js_1.Connection(RPC_URL);
        connection.getSlot().then(() => res.status(200).json({ ok: true, rpc: RPC_URL }), (err) => res.status(503).json({ ok: false, error: String(err) }));
    }
    catch (e) {
        res.status(503).json({ ok: false, error: String(e) });
    }
});
app.post("/mint", async (req, res) => {
    try {
        const { mint: mintStr, recipient, amount } = req.body;
        const mint = new web3_js_1.PublicKey(mintStr || DEFAULT_MINT);
        const recipientPubkey = new web3_js_1.PublicKey(recipient);
        const keypair = loadKeypair();
        const sdk = getSdk(mint);
        const config = await sdk.getConfig();
        if (config.isPaused)
            return res.status(400).json({ error: "Program is paused" });
        const tx = await sdk.mint(keypair.publicKey, recipientPubkey, amount);
        const sig = await tx.rpc();
        logAudit("mint", { mint: mint.toBase58(), recipient, amount, signature: sig });
        res.json({ signature: sig });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || String(e) });
    }
});
app.post("/burn", async (req, res) => {
    try {
        const { mint: mintStr, amount, from: fromStr } = req.body;
        const mint = new web3_js_1.PublicKey(mintStr || DEFAULT_MINT);
        const keypair = loadKeypair();
        const from = fromStr ? new web3_js_1.PublicKey(fromStr) : keypair.publicKey;
        const sdk = getSdk(mint);
        const config = await sdk.getConfig();
        if (config.isPaused)
            return res.status(400).json({ error: "Program is paused" });
        const tx = await sdk.burn(keypair.publicKey, from, amount);
        const sig = await tx.rpc();
        logAudit("burn", { mint: mint.toBase58(), amount, from: from.toBase58(), signature: sig });
        res.json({ signature: sig });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || String(e) });
    }
});
app.post("/blacklist/add", async (req, res) => {
    try {
        const { mint: mintStr, address: addressStr, reason } = req.body;
        const mint = new web3_js_1.PublicKey(mintStr || DEFAULT_MINT);
        const address = new web3_js_1.PublicKey(addressStr);
        const keypair = loadKeypair();
        const sdk = getSdk(mint);
        const compliance = new sss_token_1.SSSComplianceModule(sdk);
        const tx = await compliance.addToBlacklist(keypair.publicKey, address);
        const sig = await tx.rpc();
        logAudit("blacklist_add", { mint: mint.toBase58(), address: addressStr, reason, signature: sig });
        res.json({ signature: sig });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || String(e) });
    }
});
app.post("/blacklist/remove", async (req, res) => {
    try {
        const { mint: mintStr, address: addressStr } = req.body;
        const mint = new web3_js_1.PublicKey(mintStr || DEFAULT_MINT);
        const address = new web3_js_1.PublicKey(addressStr);
        const keypair = loadKeypair();
        const sdk = getSdk(mint);
        const compliance = new sss_token_1.SSSComplianceModule(sdk);
        const tx = await compliance.removeFromBlacklist(keypair.publicKey, address);
        const sig = await tx.rpc();
        logAudit("blacklist_remove", { mint: mint.toBase58(), address: addressStr, signature: sig });
        res.json({ signature: sig });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || String(e) });
    }
});
app.post("/seize", async (req, res) => {
    try {
        const { mint: mintStr, from: fromStr, treasury: treasuryStr, amount: amountStr } = req.body;
        const mint = new web3_js_1.PublicKey(mintStr || DEFAULT_MINT);
        const from = new web3_js_1.PublicKey(fromStr);
        const treasury = new web3_js_1.PublicKey(treasuryStr);
        const amount = amountStr || "0";
        const keypair = loadKeypair();
        const sdk = getSdk(mint);
        const compliance = new sss_token_1.SSSComplianceModule(sdk);
        const tx = await compliance.seize(keypair.publicKey, from, treasury, amount);
        const sig = await tx.rpc();
        logAudit("seize", { mint: mint.toBase58(), from: fromStr, treasury: treasuryStr, amount, signature: sig });
        res.json({ signature: sig });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || String(e) });
    }
});
app.get("/audit", (_req, res) => {
    res.json({ events: auditLog });
});
const server = app.listen(PORT, () => {
    console.log(`SSS backend listening on port ${PORT}; RPC=${RPC_URL}`);
});
server.on("error", (err) => {
    console.error("Server error:", err);
});

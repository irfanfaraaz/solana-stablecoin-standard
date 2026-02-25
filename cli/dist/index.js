#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const anchor_1 = require("@coral-xyz/anchor");
const sss_token_1 = require("@stbr/sss-token");
const PROGRAM_IDS = {
    stablecoin: process.env.STABLECOIN_PROGRAM_ID || "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM",
    transferHook: process.env.TRANSFER_HOOK_PROGRAM_ID || "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi",
};
function loadKeypair(keypairPath) {
    const resolved = keypairPath.startsWith("~")
        ? path.join(process.env.HOME || "", keypairPath.slice(1))
        : path.resolve(keypairPath);
    const buf = JSON.parse(fs.readFileSync(resolved, "utf-8"));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(buf));
}
function getConnection(rpcUrl) {
    return new web3_js_1.Connection(rpcUrl || process.env.RPC_URL || "http://127.0.0.1:8899");
}
function loadPrograms(connection, wallet) {
    const repoRoot = process.cwd();
    const stablecoinIdlPath = path.join(repoRoot, "target", "idl", "stablecoin.json");
    const transferHookIdlPath = path.join(repoRoot, "target", "idl", "transfer_hook.json");
    if (!fs.existsSync(stablecoinIdlPath)) {
        throw new Error(`IDL not found at ${stablecoinIdlPath}. Run "anchor build" from repo root.`);
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
function parseTomlConfig(configPath) {
    const content = fs.readFileSync(configPath, "utf-8");
    const out = {};
    for (const line of content.split("\n")) {
        const m = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
        if (!m)
            continue;
        let val = m[2].trim().replace(/^["']|["']$/g, "");
        if (val === "true")
            val = true;
        else if (val === "false")
            val = false;
        else if (/^\d+$/.test(val))
            val = parseInt(val, 10);
        out[m[1]] = val;
    }
    return {
        name: out.name,
        symbol: out.symbol,
        uri: out.uri || "",
        decimals: out.decimals || 6,
        enablePermanentDelegate: !!out.enable_permanent_delegate,
        enableTransferHook: !!out.enable_transfer_hook,
        defaultAccountFrozen: !!out.default_account_frozen,
    };
}
function output(data, json) {
    if (json)
        console.log(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    else
        console.log(data);
}
const program = new commander_1.Command();
program
    .name("sss-token")
    .description("Admin CLI for Solana Stablecoin Standard")
    .option("-k, --keypair <path>", "Keypair path", process.env.KEYPAIR_PATH || "~/.config/solana/id.json")
    .option("--rpc-url <url>", "RPC URL", process.env.RPC_URL || "http://127.0.0.1:8899")
    .option("--json", "Output JSON");
program
    .command("init")
    .description("Initialize a new stablecoin")
    .option("-p, --preset <preset>", "Preset: sss-1 or sss-2", "sss-2")
    .option("-c, --custom <path>", "Path to custom config TOML")
    .requiredOption("-n, --name <name>", "Token name (required when not using --custom)")
    .option("-s, --symbol <symbol>", "Token symbol", "SUSD")
    .option("-u, --uri <uri>", "Metadata URI", "https://example.com")
    .option("-d, --decimals <n>", "Decimals", "6")
    .action(async (opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    let config;
    if (opts.custom) {
        const custom = parseTomlConfig(opts.custom);
        config = { name: custom.name, symbol: custom.symbol, uri: custom.uri || "", decimals: custom.decimals, enablePermanentDelegate: !!custom.enablePermanentDelegate, enableTransferHook: !!custom.enableTransferHook, defaultAccountFrozen: !!custom.defaultAccountFrozen };
    }
    else {
        const preset = opts.preset === "sss-1" ? sss_token_1.SSS_1_PRESET : sss_token_1.SSS_2_PRESET;
        config = { name: opts.name, symbol: opts.symbol, uri: opts.uri, decimals: parseInt(opts.decimals, 10), ...preset };
    }
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, undefined, (transferHookProgram || undefined));
    const tx = await sdk.initialize(keypair.publicKey, config, transferHookProgram?.programId);
    const sig = await tx.rpc();
    const mint = sss_token_1.SolanaStablecoin.getMintPDA(config.symbol, stablecoinProgram.programId);
    sdk.mintAddress = mint;
    if (config.enableTransferHook && transferHookProgram) {
        const compliance = new sss_token_1.SSSComplianceModule(sdk);
        const hookTx = await compliance.initializeTransferHookExtraAccounts(keypair.publicKey);
        const hookSig = await hookTx.rpc();
        output({ mint: mint.toBase58(), configPda: sss_token_1.SolanaStablecoin.getConfigPDA(mint, stablecoinProgram.programId).toBase58(), signature: sig, transferHookInitSignature: hookSig }, program.opts().json);
    }
    else {
        output({ mint: mint.toBase58(), configPda: sss_token_1.SolanaStablecoin.getConfigPDA(mint, stablecoinProgram.programId).toBase58(), signature: sig }, program.opts().json);
    }
});
program
    .command("mint <recipient> <amount>")
    .description("Mint tokens to recipient")
    .requiredOption("-m, --mint <address>", "Mint address (or use symbol and pass mint PDA)")
    .action(async (recipient, amount, opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const tx = await sdk.mint(keypair.publicKey, new web3_js_1.PublicKey(recipient), amount);
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
program
    .command("burn <amount>")
    .description("Burn tokens from authority ATA")
    .requiredOption("-m, --mint <address>", "Mint address")
    .option("--from <address>", "Burn from this address (default: keypair)")
    .action(async (amount, opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const from = opts.from ? new web3_js_1.PublicKey(opts.from) : keypair.publicKey;
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const tx = await sdk.burn(keypair.publicKey, from, amount);
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
program
    .command("freeze <address>")
    .description("Freeze a token account")
    .requiredOption("-m, --mint <address>", "Mint address")
    .action(async (address, opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const tx = await sdk.freezeAccount(keypair.publicKey, new web3_js_1.PublicKey(address));
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
program
    .command("thaw <address>")
    .description("Thaw a frozen token account")
    .requiredOption("-m, --mint <address>", "Mint address")
    .action(async (address, opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const tx = await sdk.thawAccount(keypair.publicKey, new web3_js_1.PublicKey(address));
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
program
    .command("pause")
    .description("Pause all stablecoin operations")
    .requiredOption("-m, --mint <address>", "Mint address")
    .action(async (opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const tx = await sdk.pause(keypair.publicKey);
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
program
    .command("unpause")
    .description("Unpause stablecoin operations")
    .requiredOption("-m, --mint <address>", "Mint address")
    .action(async (opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const tx = await sdk.unpause(keypair.publicKey);
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
program
    .command("status")
    .description("Show config and pause status")
    .requiredOption("-m, --mint <address>", "Mint address")
    .action(async (opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const config = await sdk.getConfig();
    const supply = await sdk.getTotalSupply();
    const roles = await sdk.getRoles();
    output({
        mint: mint.toBase58(),
        decimals: config.decimals,
        isPaused: config.isPaused,
        supply: supply.toString(),
        masterAuthority: config.masterAuthority.toBase58(),
        roles: {
            burner: roles.burner.toBase58(),
            pauser: roles.pauser.toBase58(),
            blacklister: roles.blacklister.toBase58(),
            seizer: roles.seizer.toBase58(),
        },
    }, program.opts().json);
});
program
    .command("supply")
    .description("Show total supply")
    .requiredOption("-m, --mint <address>", "Mint address")
    .action(async (opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const supply = await sdk.getTotalSupply();
    output({ mint: mint.toBase58(), supply: supply.toString() }, program.opts().json);
});
program
    .command("blacklist")
    .description("SSS-2 blacklist commands")
    .requiredOption("-m, --mint <address>", "Mint address")
    .addCommand(new commander_1.Command("add").argument("<address>").option("-r, --reason <reason>", "Reason").action(async (address, opts, parent) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(parent.opts().mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const compliance = new sss_token_1.SSSComplianceModule(sdk);
    const tx = await compliance.addToBlacklist(keypair.publicKey, new web3_js_1.PublicKey(address), opts.reason);
    const sig = await tx.rpc();
    output({ signature: sig, reason: opts.reason }, program.opts().json);
}))
    .addCommand(new commander_1.Command("remove").argument("<address>").action(async (address, opts, parent) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new web3_js_1.PublicKey(parent.opts().mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, (transferHookProgram || undefined));
    const compliance = new sss_token_1.SSSComplianceModule(sdk);
    const tx = await compliance.removeFromBlacklist(keypair.publicKey, new web3_js_1.PublicKey(address));
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
}));
program
    .command("seize <from>")
    .description("Seize tokens from address to treasury (SSS-2)")
    .requiredOption("-m, --mint <address>", "Mint address")
    .requiredOption("-t, --to <treasury>", "Treasury address to receive tokens")
    .option("-a, --amount <amount>", "Amount to seize", "0")
    .action(async (from, opts) => {
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    if (!transferHookProgram)
        throw new Error("Transfer hook program required for seize");
    const mint = new web3_js_1.PublicKey(opts.mint);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, mint, transferHookProgram);
    const compliance = new sss_token_1.SSSComplianceModule(sdk);
    const amount = opts.amount === "0" ? (await sdk.getTotalSupply()).toString() : opts.amount;
    const tx = await compliance.seize(keypair.publicKey, new web3_js_1.PublicKey(from), new web3_js_1.PublicKey(opts.to), amount);
    const sig = await tx.rpc();
    output({ signature: sig }, program.opts().json);
});
const mintersCmd = program
    .command("minters")
    .description("List / add / remove minters")
    .requiredOption("-m, --mint <address>", "Mint address");
mintersCmd.command("list").description("List minters (info)").action(async (_opts, cmd) => {
    const mint = cmd?.parent?.opts?.()?.mint ?? mintersCmd.opts?.()?.mint;
    output({ message: "Use status for config/roles; minters are per-PDA", mint }, program.opts().json);
});
mintersCmd.command("add <minter_pubkey>").description("Add a minter with quota").option("-q, --quota <quota>", "Daily mint quota", "1000000000").action(async (minterPubkey, opts, cmd) => {
    const parent = cmd?.parent;
    const mint = parent?.opts?.()?.mint ?? mintersCmd.opts?.()?.mint;
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, new web3_js_1.PublicKey(mint), (transferHookProgram || undefined));
    const tx = await sdk.updateMinter(keypair.publicKey, new web3_js_1.PublicKey(minterPubkey), true, opts.quota);
    const sig = await tx.rpc();
    output({ signature: sig, minter: minterPubkey, quota: opts.quota }, program.opts().json);
});
mintersCmd.command("remove <minter_pubkey>").description("Remove / deactivate a minter").action(async (minterPubkey, opts, cmd) => {
    const parent = cmd?.parent;
    const mint = parent?.opts?.()?.mint ?? mintersCmd.opts?.()?.mint;
    const keypair = loadKeypair(program.opts().keypair);
    const connection = getConnection(program.opts().rpcUrl);
    const wallet = new anchor_1.Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const sdk = new sss_token_1.SolanaStablecoin(stablecoinProgram, new web3_js_1.PublicKey(mint), (transferHookProgram || undefined));
    const tx = await sdk.updateMinter(keypair.publicKey, new web3_js_1.PublicKey(minterPubkey), false, 0);
    const sig = await tx.rpc();
    output({ signature: sig, minter: minterPubkey }, program.opts().json);
});
program
    .command("holders")
    .description("List holders by balance (uses RPC getTokenLargestAccounts)")
    .requiredOption("-m, --mint <address>", "Mint address")
    .option("--min-balance <amount>", "Minimum balance (raw units)", "0")
    .action(async (opts) => {
    const connection = getConnection(program.opts().rpcUrl);
    const mint = new web3_js_1.PublicKey(opts.mint);
    const minBalance = BigInt(opts.minBalance ?? "0");
    const largest = await connection.getTokenLargestAccounts(mint);
    const holders = [];
    for (const { address, amount } of largest.value) {
        const amt = BigInt(amount);
        if (amt < minBalance)
            continue;
        try {
            const acc = await (0, spl_token_1.getAccount)(connection, address, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            holders.push({
                owner: acc.owner.toBase58(),
                tokenAccount: address.toBase58(),
                balance: amount,
            });
        }
        catch {
            // skip unreadable accounts
        }
    }
    output({ mint: opts.mint, holders, count: holders.length }, program.opts().json);
});
program
    .command("audit-log")
    .description("Audit log (use backend indexer / API; see docs/API.md)")
    .option("--action <type>", "Filter by action type")
    .action(async (opts) => {
    output({ message: "Audit log requires backend indexer. See docs/API.md and backend README.", actionFilter: opts.action }, program.opts().json);
});
program.parse();

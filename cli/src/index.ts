#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import * as web3 from "@solana/web3.js";
import { getAccount, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import {
  SolanaStablecoin,
  SSSComplianceModule,
  SSS_1_PRESET,
  SSS_2_PRESET,
  SSS_3_PRESET,
  type StablecoinConfig,
} from "@stbr/sss-token";

const PROGRAM_IDS = {
  stablecoin: process.env.STABLECOIN_PROGRAM_ID || "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM",
  transferHook: process.env.TRANSFER_HOOK_PROGRAM_ID || "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi",
  oracle: process.env.ORACLE_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
};

function loadKeypair(keypairPath: string): Keypair {
  const resolved = keypairPath.startsWith("~")
    ? path.join(process.env.HOME || "", keypairPath.slice(1))
    : path.resolve(keypairPath);
  const buf = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(buf));
}

function getConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl || process.env.RPC_URL || "https://api.devnet.solana.com");
}

function loadPrograms(connection: Connection, wallet: Wallet): {
  stablecoinProgram: Program<any>;
  transferHookProgram: Program<any> | null;
  oracleProgram: Program<any> | null;
} {
  const repoRoot = process.cwd();
  const stablecoinIdlPath = path.join(repoRoot, "target", "idl", "stablecoin.json");
  const transferHookIdlPath = path.join(repoRoot, "target", "idl", "transfer_hook.json");
  const oracleIdlPath = path.join(repoRoot, "target", "idl", "oracle.json");
  if (!fs.existsSync(stablecoinIdlPath)) {
    throw new Error(`IDL not found at ${stablecoinIdlPath}. Run "anchor build" from repo root.`);
  }
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const stablecoinIdl = JSON.parse(fs.readFileSync(stablecoinIdlPath, "utf-8"));
  (stablecoinIdl as any).address = PROGRAM_IDS.stablecoin;
  const stablecoinProgram = new Program(stablecoinIdl, provider);
  let transferHookProgram: Program<any> | null = null;
  let oracleProgram: Program<any> | null = null;
  if (fs.existsSync(transferHookIdlPath)) {
    const transferHookIdl = JSON.parse(fs.readFileSync(transferHookIdlPath, "utf-8"));
    (transferHookIdl as any).address = PROGRAM_IDS.transferHook;
    transferHookProgram = new Program(transferHookIdl, provider);
  }
  if (fs.existsSync(oracleIdlPath)) {
    const oracleIdl = JSON.parse(fs.readFileSync(oracleIdlPath, "utf-8"));
    (oracleIdl as any).address = PROGRAM_IDS.oracle;
    oracleProgram = new Program(oracleIdl, provider);
  }
  return { stablecoinProgram, transferHookProgram, oracleProgram };
}

function parseTomlConfig(configPath: string): Partial<StablecoinConfig> & { name: string; symbol: string; decimals: number; uri?: string } {
  const content = fs.readFileSync(configPath, "utf-8");
  const out: Record<string, string | number | boolean> = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
    if (!m) continue;
    let val: string | number | boolean = m[2].trim().replace(/^["']|["']$/g, "");
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (/^\d+$/.test(val)) val = parseInt(val, 10);
    out[m[1]] = val;
  }
  return {
    name: out.name as string,
    symbol: out.symbol as string,
    uri: (out.uri as string) || "",
    decimals: (out.decimals as number) || 6,
    enablePermanentDelegate: !!out.enable_permanent_delegate,
    enableTransferHook: !!out.enable_transfer_hook,
    defaultAccountFrozen: !!out.default_account_frozen,
  } as any;
}

function output(data: unknown, json: boolean) {
  if (json) console.log(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  else console.log(data);
}

function getMintFromParent(parent: Command): string {
  const mint = (parent.parent?.opts?.() ?? parent.opts?.())?.mint;
  if (!mint) throw new Error("Mint address required (use -m, --mint).");
  return mint;
}

const program = new Command();
program
  .name("sss-token")
  .description("Admin CLI for Solana Stablecoin Standard")
  .option("-k, --keypair <path>", "Keypair path", process.env.KEYPAIR_PATH || "~/.config/solana/id.json")
  .option("--rpc-url <url>", "RPC URL", process.env.RPC_URL || "https://api.devnet.solana.com")
  .option("--json", "Output JSON");

program
  .command("init")
  .description("Initialize a new stablecoin")
  .option("-p, --preset <preset>", "Preset: sss-1, sss-2, or sss-3", "sss-2")
  .option("-c, --custom <path>", "Path to custom config TOML")
  .requiredOption("-n, --name <name>", "Token name (required when not using --custom)")
  .option("-s, --symbol <symbol>", "Token symbol", "SUSD")
  .option("-u, --uri <uri>", "Metadata URI", "https://example.com")
  .option("-d, --decimals <n>", "Decimals", "6")
  .action(async (opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    let config: StablecoinConfig;
    if (opts.custom) {
      const custom = parseTomlConfig(opts.custom);
      config = { name: custom.name, symbol: custom.symbol, uri: custom.uri || "", decimals: custom.decimals, enablePermanentDelegate: !!custom.enablePermanentDelegate, enableTransferHook: !!custom.enableTransferHook, defaultAccountFrozen: !!custom.defaultAccountFrozen };
    } else {
      const preset =
        opts.preset === "sss-1" ? SSS_1_PRESET
        : opts.preset === "sss-3" ? SSS_3_PRESET
        : SSS_2_PRESET;
      config = { name: opts.name, symbol: opts.symbol, uri: opts.uri, decimals: parseInt(opts.decimals, 10), ...preset };
    }
    const sdk = new SolanaStablecoin(stablecoinProgram as any, undefined, (transferHookProgram || undefined) as any);
    const tx = await sdk.initialize(keypair.publicKey, config, transferHookProgram?.programId);
    const sig = await tx.rpc();
    const mint = SolanaStablecoin.getMintPDA(config.symbol, stablecoinProgram.programId);
    sdk.mintAddress = mint;
    if (config.enableTransferHook && transferHookProgram) {
      const compliance = new SSSComplianceModule(sdk);
      const hookTx = await compliance.initializeTransferHookExtraAccounts(keypair.publicKey, config.enableAllowlist ?? false);
      const hookSig = await hookTx.rpc();
      output({ mint: mint.toBase58(), configPda: SolanaStablecoin.getConfigPDA(mint, stablecoinProgram.programId).toBase58(), signature: sig, transferHookInitSignature: hookSig }, (program.opts() as any).json);
    } else {
      output({ mint: mint.toBase58(), configPda: SolanaStablecoin.getConfigPDA(mint, stablecoinProgram.programId).toBase58(), signature: sig }, (program.opts() as any).json);
    }
  });

program
  .command("mint <recipient> <amount>")
  .description("Mint tokens to recipient")
  .requiredOption("-m, --mint <address>", "Mint address (or use symbol and pass mint PDA)")
  .action(async (recipient, amount, opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.mint(keypair.publicKey, new PublicKey(recipient), amount);
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

program
  .command("burn <amount>")
  .description("Burn tokens from authority ATA")
  .requiredOption("-m, --mint <address>", "Mint address")
  .option("--from <address>", "Burn from this address (default: keypair)")
  .action(async (amount, opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const from = opts.from ? new PublicKey(opts.from) : keypair.publicKey;
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.burn(keypair.publicKey, from, amount);
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

program
  .command("freeze <address>")
  .description("Freeze a token account")
  .requiredOption("-m, --mint <address>", "Mint address")
  .action(async (address, opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.freezeAccount(keypair.publicKey, new PublicKey(address));
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

program
  .command("thaw <address>")
  .description("Thaw a frozen token account")
  .requiredOption("-m, --mint <address>", "Mint address")
  .action(async (address, opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.thawAccount(keypair.publicKey, new PublicKey(address));
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

program
  .command("pause")
  .description("Pause all stablecoin operations")
  .requiredOption("-m, --mint <address>", "Mint address")
  .action(async (opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.pause(keypair.publicKey);
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

program
  .command("unpause")
  .description("Unpause stablecoin operations")
  .requiredOption("-m, --mint <address>", "Mint address")
  .action(async (opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.unpause(keypair.publicKey);
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

program
  .command("status")
  .description("Show config and pause status")
  .requiredOption("-m, --mint <address>", "Mint address")
  .action(async (opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
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
    }, (program.opts() as any).json);
  });

const rolesCmd = program
  .command("roles")
  .description("View or update role accounts (burner, pauser, blacklister, seizer)")
  .requiredOption("-m, --mint <address>", "Mint address");

rolesCmd
  .command("update")
  .description("Update one or more roles (master authority only). Omitted roles are unchanged. To revoke, set role to master pubkey.")
  .option("--burner <pubkey>", "Set burner role to this pubkey")
  .option("--pauser <pubkey>", "Set pauser role to this pubkey")
  .option("--blacklister <pubkey>", "Set blacklister role to this pubkey")
  .option("--seizer <pubkey>", "Set seizer role to this pubkey")
  .action(async (opts: { burner?: string; pauser?: string; blacklister?: string; seizer?: string }, _cmd, cmd) => {
    const parent = (cmd as Command)?.parent as Command | undefined;
    const mint = parent?.opts?.()?.mint ?? (rolesCmd as any).opts?.()?.mint;
    if (!mint) throw new Error("Mint required (-m, --mint)");
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, new PublicKey(mint), (transferHookProgram || undefined) as any);
    const roles: { burner?: PublicKey | null; pauser?: PublicKey | null; blacklister?: PublicKey | null; seizer?: PublicKey | null } = {};
    if (opts.burner != null) roles.burner = new PublicKey(opts.burner);
    if (opts.pauser != null) roles.pauser = new PublicKey(opts.pauser);
    if (opts.blacklister != null) roles.blacklister = new PublicKey(opts.blacklister);
    if (opts.seizer != null) roles.seizer = new PublicKey(opts.seizer);
    if (Object.keys(roles).length === 0) {
      output({ error: "Provide at least one role: --burner, --pauser, --blacklister, or --seizer" }, (program.opts() as any).json);
      process.exitCode = 1;
      return;
    }
    const tx = await sdk.updateRoles(keypair.publicKey, roles);
    const sig = await tx.rpc();
    output({ signature: sig, updated: Object.keys(roles) }, (program.opts() as any).json);
  });

program
  .command("supply")
  .description("Show total supply")
  .requiredOption("-m, --mint <address>", "Mint address")
  .action(async (opts) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const supply = await sdk.getTotalSupply();
    output({ mint: mint.toBase58(), supply: supply.toString() }, (program.opts() as any).json);
  });

program
  .command("blacklist")
  .description("SSS-2 blacklist commands")
  .requiredOption("-m, --mint <address>", "Mint address")
  .addCommand(new Command("add").argument("<address>").option("-r, --reason <reason>", "Reason").action(async (address, opts, parent) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(getMintFromParent(parent));
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const compliance = new SSSComplianceModule(sdk);
    const tx = await compliance.addToBlacklist(keypair.publicKey, new PublicKey(address), opts.reason);
    const sig = await tx.rpc();
    output({ signature: sig, reason: opts.reason }, (program.opts() as any).json);
  }))
  .addCommand(new Command("remove").argument("<address>").action(async (address, opts, parent) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(getMintFromParent(parent));
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const compliance = new SSSComplianceModule(sdk);
    const tx = await compliance.removeFromBlacklist(keypair.publicKey, new PublicKey(address));
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  }));

program
  .command("allowlist")
  .description("SSS-3 allowlist commands (master authority only)")
  .requiredOption("-m, --mint <address>", "Mint address")
  .addCommand(new Command("add").argument("<wallet>").action(async (walletAddress, _opts, parent) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(getMintFromParent(parent));
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.addToAllowlist(keypair.publicKey, new PublicKey(walletAddress));
    const sig = await tx.rpc();
    output({ signature: sig, wallet: walletAddress }, (program.opts() as any).json);
  }))
  .addCommand(new Command("remove").argument("<wallet>").action(async (walletAddress, _opts, parent) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    const mint = new PublicKey(getMintFromParent(parent));
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, (transferHookProgram || undefined) as any);
    const tx = await sdk.removeFromAllowlist(keypair.publicKey, new PublicKey(walletAddress));
    const sig = await tx.rpc();
    output({ signature: sig, wallet: walletAddress }, (program.opts() as any).json);
  }));

program
  .command("seize <from>")
  .description("Seize tokens from address to treasury (SSS-2)")
  .requiredOption("-m, --mint <address>", "Mint address")
  .requiredOption("-t, --to <treasury>", "Treasury address to receive tokens")
  .option("-a, --amount <amount>", "Amount to seize", "0")
  .action(async (from: string, opts: any) => {
    const keypair = loadKeypair((program.opts() as any).keypair);
    const connection = getConnection((program.opts() as any).rpcUrl);
    const wallet = new Wallet(keypair);
    const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
    if (!transferHookProgram) throw new Error("Transfer hook program required for seize");
    const mint = new PublicKey(opts.mint);
    const sdk = new SolanaStablecoin(stablecoinProgram as any, mint, transferHookProgram as any);
    const compliance = new SSSComplianceModule(sdk);
    const amount = opts.amount === "0" ? (await sdk.getTotalSupply()).toString() : opts.amount;
    const tx = await compliance.seize(keypair.publicKey, new PublicKey(from), new PublicKey(opts.to), amount);
    const sig = await tx.rpc();
    output({ signature: sig }, (program.opts() as any).json);
  });

const mintersCmd = program
  .command("minters")
  .description("List / add / remove minters")
  .requiredOption("-m, --mint <address>", "Mint address");
mintersCmd.command("list").description("List minters (info)").action(async (_opts: any, cmd?: Command) => {
  const mint = (cmd?.parent as Command)?.opts?.()?.mint ?? (mintersCmd as any).opts?.()?.mint;
  output({ message: "Use status for config/roles; minters are per-PDA", mint }, (program.opts() as any).json);
});
mintersCmd.command("add <minter_pubkey>").description("Add a minter with quota").option("-q, --quota <quota>", "Daily mint quota", "1000000000").action(async (minterPubkey: string, opts: any, cmd?: Command) => {
  const parent = cmd?.parent as Command | undefined;
  const mint = parent?.opts?.()?.mint ?? (mintersCmd as any).opts?.()?.mint;
  const keypair = loadKeypair((program.opts() as any).keypair);
  const connection = getConnection((program.opts() as any).rpcUrl);
  const wallet = new Wallet(keypair);
  const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
  const sdk = new SolanaStablecoin(stablecoinProgram as any, new PublicKey(mint), (transferHookProgram || undefined) as any);
  const tx = await sdk.updateMinter(keypair.publicKey, new PublicKey(minterPubkey), true, opts.quota);
  const sig = await tx.rpc();
  output({ signature: sig, minter: minterPubkey, quota: opts.quota }, (program.opts() as any).json);
});
mintersCmd.command("remove <minter_pubkey>").description("Remove / deactivate a minter").action(async (minterPubkey: string, opts: any, cmd?: Command) => {
  const parent = cmd?.parent as Command | undefined;
  const mint = parent?.opts?.()?.mint ?? (mintersCmd as any).opts?.()?.mint;
  const keypair = loadKeypair((program.opts() as any).keypair);
  const connection = getConnection((program.opts() as any).rpcUrl);
  const wallet = new Wallet(keypair);
  const { stablecoinProgram, transferHookProgram } = loadPrograms(connection, wallet);
  const sdk = new SolanaStablecoin(stablecoinProgram as any, new PublicKey(mint), (transferHookProgram || undefined) as any);
  const tx = await sdk.updateMinter(keypair.publicKey, new PublicKey(minterPubkey), false, 0);
  const sig = await tx.rpc();
  output({ signature: sig, minter: minterPubkey }, (program.opts() as any).json);
});

program
  .command("holders")
  .description("List holders by balance (uses RPC getTokenLargestAccounts)")
  .requiredOption("-m, --mint <address>", "Mint address")
  .option("--min-balance <amount>", "Minimum balance (raw units)", "0")
  .action(async (opts) => {
    const connection = getConnection((program.opts() as any).rpcUrl);
    const mint = new PublicKey(opts.mint);
    const minBalance = BigInt(opts.minBalance ?? "0");
    const largest = await connection.getTokenLargestAccounts(mint);
    const holders: { owner: string; tokenAccount: string; balance: string }[] = [];
    for (const { address, amount } of largest.value) {
      const amt = BigInt(amount);
      if (amt < minBalance) continue;
      try {
        const acc = await getAccount(connection, address, "confirmed", TOKEN_2022_PROGRAM_ID);
        holders.push({
          owner: acc.owner.toBase58(),
          tokenAccount: address.toBase58(),
          balance: amount,
        });
      } catch {
        // skip unreadable accounts
      }
    }
    output({ mint: opts.mint, holders, count: holders.length }, (program.opts() as any).json);
  });

program
  .command("oracle")
  .description("Oracle helpers (price-based mint/redeem, experimental)")
  .requiredOption("--queue <address>", "Switchboard queue public key")
  .action((_cmdOpts) => {
    output(
      {
        message:
          "Oracle helpers are available via the SDK (computeMintAmountFromOracle) and program IDL; see docs/ORACLE.md for full examples.",
      },
      (program.opts() as any).json,
    );
  });

program
  .command("audit-log")
  .description("Show audit log (from backend API when --backend-url is set)")
  .option("--backend-url <url>", "Backend API base URL (e.g. http://localhost:3000)")
  .option("--format <format>", "Export format when using backend: json or csv", "json")
  .option("--action <type>", "Filter by action type (mint, burn, blacklist_add, etc.)")
  .action(async (opts: { backendUrl?: string; format?: string; action?: string }) => {
    const jsonOut = (program.opts() as any).json;
    if (opts.backendUrl) {
      const base = opts.backendUrl.replace(/\/$/, "");
      const format = (opts.format || "json").toLowerCase();
      const url = format === "csv" ? `${base}/audit/export?format=csv` : `${base}/audit`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Backend returned ${res.status}: ${res.statusText}`);
        if (format === "csv") {
          const text = await res.text();
          if (jsonOut) {
            output({ raw: text }, true);
          } else {
            console.log(text);
          }
        } else {
          const data = (await res.json()) as { events?: unknown[] };
          let events = data.events ?? [];
          if (opts.action) {
            const action = opts.action.toLowerCase();
            events = events.filter((e: unknown) => ((e as { event?: string }).event ?? "").toLowerCase() === action);
          }
          output({ events }, jsonOut);
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        output({ error: `Failed to fetch audit log: ${msg}` }, jsonOut);
        process.exitCode = 1;
      }
    } else {
      output(
        { message: "Provide --backend-url to fetch audit log from the backend API (e.g. --backend-url http://localhost:3000). See docs/API.md and backend README." },
        jsonOut
      );
    }
  });

program.parse();

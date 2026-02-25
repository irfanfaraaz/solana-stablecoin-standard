import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";

const PROGRAM_IDS = {
  stablecoin:
    process.env.STABLECOIN_PROGRAM_ID ||
    "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM",
  transferHook:
    process.env.TRANSFER_HOOK_PROGRAM_ID ||
    "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi",
};

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "target", "idl", "stablecoin.json"))) {
    return cwd;
  }
  const parent = path.dirname(cwd);
  if (parent !== cwd && fs.existsSync(path.join(parent, "target", "idl", "stablecoin.json"))) {
    return parent;
  }
  return cwd;
}

export function loadKeypair(keypairPath: string): Keypair {
  const resolved = keypairPath.startsWith("~")
    ? path.join(process.env.HOME ?? "", keypairPath.slice(1))
    : path.resolve(keypairPath);
  const buf = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(buf));
}

export function getConnection(rpcUrl?: string): Connection {
  const url = rpcUrl ?? process.env.RPC_URL ?? "http://127.0.0.1:8899";
  return new Connection(url, { commitment: "confirmed" });
}

export interface LoadedPrograms {
  stablecoinProgram: Program;
  transferHookProgram: Program | null;
  provider: AnchorProvider;
  wallet: Wallet;
}

export function loadPrograms(
  connection: Connection,
  wallet: Wallet
): LoadedPrograms {
  const repoRoot = resolveRepoRoot();
  const stablecoinIdlPath = path.join(
    repoRoot,
    "target",
    "idl",
    "stablecoin.json"
  );
  const transferHookIdlPath = path.join(
    repoRoot,
    "target",
    "idl",
    "transfer_hook.json"
  );

  if (!fs.existsSync(stablecoinIdlPath)) {
    throw new Error(
      `IDL not found at ${stablecoinIdlPath}. Run "anchor build" from repo root.`
    );
  }

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const stablecoinIdl = JSON.parse(
    fs.readFileSync(stablecoinIdlPath, "utf-8")
  ) as object;
  (stablecoinIdl as { address?: string }).address =
    PROGRAM_IDS.stablecoin;
  const stablecoinProgram = new Program(stablecoinIdl as any, provider);

  let transferHookProgram: Program | null = null;
  if (fs.existsSync(transferHookIdlPath)) {
    const transferHookIdl = JSON.parse(
      fs.readFileSync(transferHookIdlPath, "utf-8")
    ) as object;
    (transferHookIdl as { address?: string }).address =
      PROGRAM_IDS.transferHook;
    transferHookProgram = new Program(transferHookIdl as any, provider);
  }

  return {
    stablecoinProgram,
    transferHookProgram,
    provider,
    wallet,
  };
}

export * from "./core";
import { SolanaStablecoin } from "./core";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { TransactionInstruction } from "@solana/web3.js";

export async function buildMintInstructions(
  connection: Connection,
  sdk: SolanaStablecoin,
  authority: PublicKey,
  to: PublicKey,
  amount: number | string,
  feePayer: PublicKey
): Promise<TransactionInstruction[]> {
  return SolanaStablecoin.buildMintInstructions(
    connection,
    sdk,
    authority,
    to,
    amount,
    feePayer
  );
}
export * from "./compliance";
export * from "./confidential";
export * from "./presets";
export * from "./oracle";

import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { Oracle } from "../../target/types/oracle";

export interface OracleComputeAmountParams {
  connection: Connection;
  program: Program<Oracle>;
  /** Switchboard queue account for this feed. */
  queue: PublicKey;
  /** SYSVAR_SLOT_HASHES_PUBKEY */
  slotHashes: PublicKey;
  /** SYSVAR_INSTRUCTIONS_PUBKEY */
  instructionsSysvar: PublicKey;
  /** Peg amount in smallest units (e.g. 100 EUR with 6 decimals = 100_000_000). */
  pegAmount: bigint;
  /** Stablecoin token decimals (0–18). */
  tokenDecimals: number;
  /** Optional additional instructions (e.g. Switchboard update + Ed25519 verify) that must run before oracle ix. */
  preInstructions?: TransactionInstruction[];
}

export async function computeMintAmountFromOracle(
  params: OracleComputeAmountParams
): Promise<bigint> {
  const {
    connection,
    program,
    queue,
    slotHashes,
    instructionsSysvar,
    pegAmount,
    tokenDecimals,
    preInstructions = [],
  } = params;

  const ix = await program.methods
    .computeMintAmount(pegAmount, tokenDecimals)
    .accounts({
      queue,
      slotHashes,
      instructions: instructionsSysvar,
    })
    .instruction();

  const tx = new Transaction();
  for (const pre of preInstructions) {
    tx.add(pre);
  }
  tx.add(ix);

  // For now, rely on the legacy simulateTransaction signature and cast to avoid
  // VersionedTransaction typing requirements. The helper is intended for
  // off-chain price discovery, not for production-critical paths.
  const sim = await (connection as any).simulateTransaction(tx);
  const err = sim.value.err;
  if (err) {
    throw new Error(
      `Oracle simulateTransaction failed: ${JSON.stringify(err)}`
    );
  }
  const returnData = sim.value.returnData;
  if (!returnData) {
    throw new Error("Oracle did not set return data");
  }
  const data = Buffer.from(
    returnData.data[0],
    returnData.data[1] as BufferEncoding
  );
  if (data.length !== 8) {
    throw new Error(`Unexpected oracle return data length: ${data.length}`);
  }
  return data.readBigUInt64LE(0);
}

"use client";

import type { TransactionInstruction } from "@solana/web3.js";
import { toAddress } from "@solana/client";

/**
 * Convert web3.js TransactionInstruction to the shape @solana/client expects
 * (kit-style: programAddress, data, accounts) so we never pass undefined and
 * avoid "Expected base58-encoded address string... Actual length: 9" (undefined).
 */
export function web3InstructionToKitFormat(
  ix: TransactionInstruction
): { programAddress: ReturnType<typeof toAddress>; data: Uint8Array; accounts: readonly { address: ReturnType<typeof toAddress>; role: number }[] } {
  return {
    programAddress: toAddress(ix.programId.toBase58()),
    data: new Uint8Array(ix.data),
    accounts: ix.keys.map((k) => ({
      address: toAddress(k.pubkey.toBase58()),
      role: (k.isSigner ? 2 : 0) + (k.isWritable ? 1 : 0),
    })),
  };
}

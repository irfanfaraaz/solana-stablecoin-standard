"use client";

import type { TransactionInstruction } from "@solana/web3.js";
import { toAddress } from "@solana/client";

/**
 * Get a TransactionInstruction from an Anchor method builder.
 * Handles 0.30/0.31, Promise-wrapped builders, and minified/bundled shapes.
 */
export async function builderToInstruction(
  builder: unknown
): Promise<TransactionInstruction> {
  const b =
    builder != null && typeof (builder as Promise<unknown>).then === "function"
      ? await (builder as Promise<unknown>)
      : builder;

  const anyB = b as Record<string, unknown>;

  if (typeof anyB?.prepare === "function") {
    const out = await (
      anyB.prepare as () => Promise<{ instruction?: TransactionInstruction }>
    )();
    if (out?.instruction) return out.instruction;
  }

  if (typeof anyB?.instruction === "function") {
    return await (anyB.instruction as () => Promise<TransactionInstruction>)();
  }

  if (
    anyB?.instruction != null &&
    typeof (anyB.instruction as Promise<TransactionInstruction>).then ===
      "function"
  ) {
    return await (anyB.instruction as Promise<TransactionInstruction>);
  }

  if (anyB?.instruction != null && isTransactionInstruction(anyB.instruction)) {
    return anyB.instruction as TransactionInstruction;
  }

  const proto =
    b != null ? (Object.getPrototypeOf(b) as Record<string, unknown>) : null;
  if (proto && typeof proto.instruction === "function") {
    return await (
      proto.instruction as () => Promise<TransactionInstruction>
    ).call(b);
  }
  if (proto && typeof proto.prepare === "function") {
    const out = await (
      proto.prepare as () => Promise<{ instruction?: TransactionInstruction }>
    ).call(b);
    if (out?.instruction) return out.instruction;
  }

  if (typeof anyB?.transaction === "function") {
    const tx = await (
      anyB.transaction as () => Promise<{
        instructions?: TransactionInstruction[];
      }>
    )();
    const ix = tx?.instructions?.[0];
    if (ix) return ix;
  }

  throw new Error(
    "Anchor builder missing .instruction() and .prepare(). " +
      "Check that @coral-xyz/anchor version matches the SDK (e.g. 0.30 or 0.31)."
  );
}

function isTransactionInstruction(v: unknown): v is TransactionInstruction {
  return (
    typeof v === "object" &&
    v != null &&
    "programId" in v &&
    "data" in v &&
    "keys" in v
  );
}

/**
 * Convert web3.js TransactionInstruction to the shape @solana/client expects
 * (kit-style: programAddress, data, accounts) so we never pass undefined and
 * avoid "Expected base58-encoded address string... Actual length: 9" (undefined).
 */
export function web3InstructionToKitFormat(ix: TransactionInstruction): {
  programAddress: ReturnType<typeof toAddress>;
  data: Uint8Array;
  accounts: readonly { address: ReturnType<typeof toAddress>; role: number }[];
} {
  return {
    programAddress: toAddress(ix.programId.toBase58()),
    data: new Uint8Array(ix.data),
    accounts: ix.keys.map((k) => ({
      address: toAddress(k.pubkey.toBase58()),
      role: (k.isSigner ? 2 : 0) + (k.isWritable ? 1 : 0),
    })),
  };
}

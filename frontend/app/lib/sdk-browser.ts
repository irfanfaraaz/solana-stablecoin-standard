"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  STABLECOIN_PROGRAM_ID,
  TRANSFER_HOOK_PROGRAM_ID,
  RPC_URL,
} from "./constants";

const STABLECOIN_IDL_URL = "/idl/stablecoin.json";
const TRANSFER_HOOK_IDL_URL = "/idl/transfer_hook.json";

export type IdlPair = { stablecoin: Idl; transferHook?: Idl };

/** Fetch IDL JSON from public folder. */
export async function fetchIdl(): Promise<IdlPair> {
  const [stablecoinRes, transferHookRes] = await Promise.all([
    fetch(STABLECOIN_IDL_URL),
    fetch(TRANSFER_HOOK_IDL_URL).catch(() => null),
  ]);
  if (!stablecoinRes.ok) {
    throw new Error(
      `IDL not found at ${STABLECOIN_IDL_URL}. Copy target/idl/*.json to frontend/public/idl/ after anchor build.`
    );
  }
  const stablecoin = (await stablecoinRes.json()) as Idl;
  const transferHook = transferHookRes?.ok
    ? ((await transferHookRes.json()) as Idl)
    : undefined;
  return { stablecoin, transferHook };
}

/** Create an Anchor Wallet that only exposes publicKey (for building instructions). Signing is done via useSendTransaction. */
export function createAnchorWalletAdapter(publicKey: PublicKey): Wallet {
  return {
    publicKey,
    signTransaction: async () => {
      throw new Error(
        "Use useSendTransaction to sign/send; do not call .rpc() on SDK methods."
      );
    },
    signAllTransactions: async () => {
      throw new Error(
        "Use useSendTransaction to sign/send; do not call .rpc() on SDK methods."
      );
    },
  } as unknown as Wallet;
}

/** Build Connection and Anchor Provider for the SDK (browser). Uses IDL from /idl/. */
export async function createSdkContext(
  walletPublicKey: PublicKey,
  rpcUrl: string = RPC_URL
) {
  const connection = new Connection(rpcUrl, { commitment: "confirmed" });
  const { stablecoin: stablecoinIdl, transferHook: transferHookIdl } =
    await fetchIdl();

  const wallet = createAnchorWalletAdapter(walletPublicKey);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const stablecoinProgramId = new PublicKey(STABLECOIN_PROGRAM_ID);
  const transferHookProgramId = new PublicKey(TRANSFER_HOOK_PROGRAM_ID);

  (stablecoinIdl as { address?: string }).address =
    stablecoinProgramId.toBase58();
  const stablecoinProgram = new Program(stablecoinIdl as any, provider);

  let transferHookProgram: Program | null = null;
  if (transferHookIdl) {
    (transferHookIdl as { address?: string }).address =
      transferHookProgramId.toBase58();
    transferHookProgram = new Program(transferHookIdl as any, provider);
  }

  return {
    connection,
    provider,
    stablecoinProgram,
    transferHookProgram,
    stablecoinProgramId,
    transferHookProgramId,
  };
}

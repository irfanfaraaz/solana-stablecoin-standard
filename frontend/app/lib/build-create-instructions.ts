"use client";

import { PublicKey } from "@solana/web3.js";
import type { TransactionInstruction } from "@solana/web3.js";
import { createSdkContext } from "./sdk-browser";

export type PresetKind = "sss-1" | "sss-2";

export interface CreateStablecoinParams {
  preset: PresetKind;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
}

/**
 * Build initialize (+ optional SSS-2 hook init) instructions using the SDK.
 * Caller signs and sends via useSendTransaction / useWalletActions.
 */
export async function buildCreateStablecoinInstructions(
  authorityPublicKey: PublicKey,
  params: CreateStablecoinParams
): Promise<TransactionInstruction[]> {
  const { SolanaStablecoin, SSS_1_PRESET, SSS_2_PRESET } = await import(
    "@stbr/sss-token"
  );
  const { stablecoinProgram, transferHookProgram } = await createSdkContext(
    authorityPublicKey
  );

  const preset =
    params.preset === "sss-2"
      ? { ...SSS_2_PRESET }
      : { ...SSS_1_PRESET };
  const config = {
    name: params.name,
    symbol: params.symbol,
    uri: params.uri,
    decimals: params.decimals,
    ...preset,
  };

  const instance = new (SolanaStablecoin as any)(
    stablecoinProgram,
    undefined,
    transferHookProgram ?? undefined
  );
  const initBuilder = await instance.initialize(
    authorityPublicKey,
    config as any,
    transferHookProgram?.programId ?? undefined
  );
  const initIx = await initBuilder.instruction();
  const instructions: TransactionInstruction[] = [initIx];

  if (
    config.enableTransferHook &&
    transferHookProgram &&
    instance.mintAddress
  ) {
    const { SSSComplianceModule } = await import("@stbr/sss-token");
    const compliance = new SSSComplianceModule(instance as any);
    const hookBuilder = await compliance.initializeTransferHookExtraAccounts(
      authorityPublicKey,
      (config as any).enableAllowlist ?? false
    );
    const hookIx = await hookBuilder.instruction();
    instructions.push(hookIx);
  }

  return instructions;
}

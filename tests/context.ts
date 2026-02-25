import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin, SSSComplianceModule } from "../sdk/src";
import type { Stablecoin } from "../target/types/stablecoin";
import type { TransferHook } from "../target/types/transfer_hook";

export interface TestContext {
  provider: anchor.AnchorProvider;
  connection: anchor.web3.Connection;
  authority: anchor.Wallet;
  stablecoinProgram: Program<Stablecoin>;
  transferHookProgram: Program<TransferHook>;
  user1: anchor.web3.Keypair;
  user2: anchor.web3.Keypair;
  sss1Sdk: SolanaStablecoin;
  sss2Sdk: SolanaStablecoin;
  complianceSdk: SSSComplianceModule;
}

export function createTestContext(): TestContext {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const stablecoinProgram = anchor.workspace.Stablecoin as Program<Stablecoin>;
  const transferHookProgram = anchor.workspace
    .TransferHook as Program<TransferHook>;
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const sss1Sdk = new SolanaStablecoin(stablecoinProgram);
  const sss2Sdk = new SolanaStablecoin(
    stablecoinProgram,
    undefined,
    transferHookProgram,
  );
  const complianceSdk = new SSSComplianceModule(sss2Sdk);
  return {
    provider,
    connection: provider.connection,
    authority: provider.wallet as anchor.Wallet,
    stablecoinProgram,
    transferHookProgram,
    user1,
    user2,
    sss1Sdk,
    sss2Sdk,
    complianceSdk,
  };
}

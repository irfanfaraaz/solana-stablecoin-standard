import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin, SSSComplianceModule } from "../sdk/src";
import type { Oracle } from "../target/types/oracle";
import type { Stablecoin } from "../target/types/stablecoin";
import type { TransferHook } from "../target/types/transfer_hook";

export interface TestContext {
  provider: anchor.AnchorProvider;
  connection: anchor.web3.Connection;
  authority: anchor.Wallet;
  stablecoinProgram: Program<Stablecoin>;
  transferHookProgram: Program<TransferHook>;
  oracleProgram: Program<Oracle>;
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
  const oracleProgram = anchor.workspace.Oracle as Program<Oracle>;
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  const sss1Sdk = new SolanaStablecoin(stablecoinProgram as any);
  const sss2Sdk = new SolanaStablecoin(
    stablecoinProgram as any,
    undefined,
    transferHookProgram as any,
  );
  const complianceSdk = new SSSComplianceModule(sss2Sdk);
  return {
    provider,
    connection: provider.connection,
    authority: provider.wallet as anchor.Wallet,
    stablecoinProgram,
    transferHookProgram,
    oracleProgram,
    user1,
    user2,
    sss1Sdk,
    sss2Sdk,
    complianceSdk,
  };
}

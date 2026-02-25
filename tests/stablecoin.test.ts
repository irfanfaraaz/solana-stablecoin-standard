import * as anchor from "@coral-xyz/anchor";
import { createTestContext } from "./context";
import { registerSSS2VanillaSuite } from "./suites/sss2-vanilla";
import { registerSSS1IntegrationSuite } from "./suites/sss1-integration";
import { registerPresetConfigSuite } from "./suites/preset-config";
import { registerSSS3AllowlistSuite } from "./suites/sss3-allowlist";
import { registerUnitErrorsSuite } from "./suites/unit-errors";
import { registerUnitSuccessSuite } from "./suites/unit-success";
import { registerSdkUnitSuite } from "./suites/sdk-unit";

describe("solana-stablecoin-standard", () => {
  const ctx = createTestContext();

  before(async () => {
    const airdrop1 = await ctx.connection.requestAirdrop(
      ctx.user1.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL,
    );
    const airdrop2 = await ctx.connection.requestAirdrop(
      ctx.user2.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL,
    );
    const latestBlockHash = await ctx.connection.getLatestBlockhash();
    await ctx.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdrop1,
    });
    await ctx.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdrop2,
    });
  });

  registerSSS2VanillaSuite(ctx);
  registerSSS1IntegrationSuite(ctx);
  registerPresetConfigSuite(ctx);
  registerSSS3AllowlistSuite(ctx);
  registerUnitErrorsSuite(ctx);
  registerUnitSuccessSuite(ctx);
  registerSdkUnitSuite(ctx);
});

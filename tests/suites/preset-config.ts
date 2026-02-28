import { expect } from "chai";
import { SolanaStablecoin } from "../../sdk/src";
import type { TestContext } from "../context";

export function registerPresetConfigSuite(ctx: TestContext): void {
  const { stablecoinProgram, transferHookProgram } = ctx;

  describe("Preset config tests", () => {
    it("SSS-2 mint has enableTransferHook and enablePermanentDelegate true", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram,
        mintPda,
        transferHookProgram
      );
      const config = await sdk.getConfig();
      expect(config.enableTransferHook).to.be.true;
      expect(config.enablePermanentDelegate).to.be.true;
      expect(config.decimals).to.equal(6);
      expect(config.isPaused).to.be.false;
      expect(config.name).to.equal("Superteam USD");
      expect(config.symbol).to.equal("SUSD");
      expect(config.uri).to.equal("https://superteam.fun");
      expect(config.defaultAccountFrozen).to.be.false;
    });

    it("SSS-1 mint has enableTransferHook and enablePermanentDelegate false", async () => {
      const sss1Mint = SolanaStablecoin.getMintPDA(
        "SSS1",
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(stablecoinProgram, sss1Mint);
      const config = await sdk.getConfig();
      expect(config.enableTransferHook).to.be.false;
      expect(config.enablePermanentDelegate).to.be.false;
      expect(config.decimals).to.equal(6);
      expect(config.name).to.equal("SSS1 Minimal");
      expect(config.symbol).to.equal("SSS1");
      expect(config.uri).to.equal("https://example.com/sss1");
      expect(config.defaultAccountFrozen).to.be.false;
    });

    it("SSS-3 mint has enableConfidentialTransfers and enableAllowlist true", async () => {
      const pusdMint = SolanaStablecoin.getMintPDA(
        "PUSD",
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram,
        pusdMint,
        transferHookProgram
      );
      const config = await sdk.getConfig();
      expect(config.enableConfidentialTransfers).to.be.true;
      expect(config.enableAllowlist).to.be.true;
      expect(config.enableTransferHook).to.be.true;
      expect(config.decimals).to.equal(6);
      expect(config.name).to.equal("Private USD");
      expect(config.symbol).to.equal("PUSD");
    });
  });
}

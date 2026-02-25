import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { SolanaStablecoin } from "../../sdk/src";
import type { TestContext } from "../context";

export function registerSdkUnitSuite(ctx: TestContext): void {
  const {
    connection,
    authority,
    stablecoinProgram,
    transferHookProgram,
    user1,
    sss2Sdk,
  } = ctx;

  describe("SDK unit tests", () => {
    it("getTotalSupply returns BN and increases after mint", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram,
        mintPda,
        transferHookProgram,
      );
      const supplyBefore = await sdk.getTotalSupply();
      expect(typeof supplyBefore).to.equal("bigint");
      expect(Number(supplyBefore)).to.be.gte(0);
      await sss2Sdk
        .mint(authority.publicKey, user1.publicKey, 100)
        .then((tx) => tx.rpc());
      const supplyAfter = await sdk.getTotalSupply();
      expect(Number(supplyAfter)).to.equal(Number(supplyBefore) + 100);
    });

    it("getConfig returns shape with decimals, isPaused, flags", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram,
        mintPda,
        transferHookProgram,
      );
      const config = await sdk.getConfig();
      expect(config).to.have.property("decimals", 6);
      expect(config).to.have.property("isPaused");
      expect(config).to.have.property("masterAuthority");
      expect(config).to.have.property("mint");
      expect(config.mint.toBase58()).to.equal(mintPda.toBase58());
      expect(config).to.have.property("name");
      expect(config).to.have.property("symbol", "SUSD");
      expect(config).to.have.property("uri");
      expect(config).to.have.property("defaultAccountFrozen");
      expect(config).to.have.property("enableTransferHook", true);
      expect(config).to.have.property("enablePermanentDelegate", true);
      expect(config).to.have.property("bump");
    });

    it("getRoles returns burner, pauser, blacklister, seizer", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram,
        mintPda,
        transferHookProgram,
      );
      const roles = await sdk.getRoles();
      expect(roles).to.have.property("burner");
      expect(roles).to.have.property("pauser");
      expect(roles).to.have.property("blacklister");
      expect(roles).to.have.property("seizer");
      expect(roles).to.have.property("bump");
      const rolesPda = SolanaStablecoin.getRoleAccountPDA(
        mintPda,
        stablecoinProgram.programId,
      );
      const raw = await stablecoinProgram.account.roleAccount.fetch(rolesPda);
      expect(roles.burner.toBase58()).to.equal(raw.burner.toBase58());
      expect(roles.pauser.toBase58()).to.equal(raw.pauser.toBase58());
    });

    it("SolanaStablecoin.load returns instance with getConfig/getTotalSupply", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const loaded = SolanaStablecoin.load(
        stablecoinProgram,
        mintPda,
        transferHookProgram,
      );
      expect(loaded.mintAddress?.toBase58()).to.equal(mintPda.toBase58());
      const config = await loaded.getConfig();
      expect(config.decimals).to.equal(6);
      const supply = await loaded.getTotalSupply();
      expect(typeof supply).to.equal("bigint");
    });
  });
}

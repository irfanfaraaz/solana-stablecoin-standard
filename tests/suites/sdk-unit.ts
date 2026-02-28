import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  SolanaStablecoin,
  buildMintInstructions,
  SSS_1_PRESET,
  SSS_2_PRESET,
  SSS_3_PRESET,
  Presets,
} from "../../sdk/src";
import type { TestContext } from "../context";

const STABLECOIN_PROGRAM_ID = new PublicKey(
  "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM"
);

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
    describe("PDA derivation", () => {
      it("getMintPDA is deterministic for same symbol and program", () => {
        const a = SolanaStablecoin.getMintPDA("SUSD", STABLECOIN_PROGRAM_ID);
        const b = SolanaStablecoin.getMintPDA("SUSD", STABLECOIN_PROGRAM_ID);
        expect(a.toBase58()).to.equal(b.toBase58());
      });

      it("getMintPDA differs for different symbols", () => {
        const a = SolanaStablecoin.getMintPDA("SUSD", STABLECOIN_PROGRAM_ID);
        const b = SolanaStablecoin.getMintPDA("USDC", STABLECOIN_PROGRAM_ID);
        expect(a.toBase58()).to.not.equal(b.toBase58());
      });

      it("getConfigPDA is deterministic for same mint and program", () => {
        const mint = SolanaStablecoin.getMintPDA("X", STABLECOIN_PROGRAM_ID);
        const a = SolanaStablecoin.getConfigPDA(mint, STABLECOIN_PROGRAM_ID);
        const b = SolanaStablecoin.getConfigPDA(mint, STABLECOIN_PROGRAM_ID);
        expect(a.toBase58()).to.equal(b.toBase58());
      });

      it("getRoleAccountPDA is deterministic for same mint and program", () => {
        const mint = SolanaStablecoin.getMintPDA("X", STABLECOIN_PROGRAM_ID);
        const a = SolanaStablecoin.getRoleAccountPDA(
          mint,
          STABLECOIN_PROGRAM_ID
        );
        const b = SolanaStablecoin.getRoleAccountPDA(
          mint,
          STABLECOIN_PROGRAM_ID
        );
        expect(a.toBase58()).to.equal(b.toBase58());
      });

      it("getMinterPDA differs for different minter pubkeys", () => {
        const mint = SolanaStablecoin.getMintPDA("X", STABLECOIN_PROGRAM_ID);
        const minter1 = PublicKey.default;
        const minter2 = new PublicKey("11111111111111111111111111111112");
        const a = SolanaStablecoin.getMinterPDA(
          mint,
          minter1,
          STABLECOIN_PROGRAM_ID
        );
        const b = SolanaStablecoin.getMinterPDA(
          mint,
          minter2,
          STABLECOIN_PROGRAM_ID
        );
        expect(a.toBase58()).to.not.equal(b.toBase58());
      });

      it("getBlacklistEntryPDA and getAllowlistEntryPDA use distinct seeds", () => {
        const mint = SolanaStablecoin.getMintPDA("X", STABLECOIN_PROGRAM_ID);
        const wallet = PublicKey.default;
        const blacklistPda = SolanaStablecoin.getBlacklistEntryPDA(
          mint,
          wallet,
          STABLECOIN_PROGRAM_ID
        );
        const allowlistPda = SolanaStablecoin.getAllowlistEntryPDA(
          mint,
          wallet,
          STABLECOIN_PROGRAM_ID
        );
        expect(blacklistPda.toBase58()).to.not.equal(allowlistPda.toBase58());
      });
    });

    describe("Presets", () => {
      it("SSS_1_PRESET has enableTransferHook false", () => {
        expect(SSS_1_PRESET.enableTransferHook).to.equal(false);
      });
      it("SSS_2_PRESET has enableTransferHook and enablePermanentDelegate true", () => {
        expect(SSS_2_PRESET.enableTransferHook).to.equal(true);
        expect(SSS_2_PRESET.enablePermanentDelegate).to.equal(true);
      });
      it("SSS_3_PRESET has enableConfidentialTransfers and enableAllowlist true", () => {
        expect(SSS_3_PRESET.enableConfidentialTransfers).to.equal(true);
        expect(SSS_3_PRESET.enableAllowlist).to.equal(true);
      });
      it("Presets.SSS_1 equals SSS_1_PRESET", () => {
        expect(Presets.SSS_1).to.deep.equal(SSS_1_PRESET);
      });
      it("Presets.SSS_2 equals SSS_2_PRESET", () => {
        expect(Presets.SSS_2).to.deep.equal(SSS_2_PRESET);
      });
    });

    it("getTotalSupply returns 0 for mint with no supply", async () => {
      const Z0_SYMBOL = "Z0";
      const noMintSdk = new SolanaStablecoin(stablecoinProgram as any);
      await noMintSdk
        .initialize(authority.publicKey, {
          name: "Zero Supply",
          symbol: Z0_SYMBOL,
          uri: "https://example.com/z0",
          decimals: 6,
          ...SSS_1_PRESET,
        })
        .then((tx) => tx.rpc());
      const z0Mint = SolanaStablecoin.getMintPDA(
        Z0_SYMBOL,
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(stablecoinProgram as any, z0Mint);
      const supply = await sdk.getTotalSupply();
      expect(typeof supply).to.equal("bigint");
      expect(Number(supply)).to.equal(0);
    });

    it("getTotalSupply returns BN and increases after mint", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram as any,
        mintPda,
        transferHookProgram as any
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
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram as any,
        mintPda,
        transferHookProgram as any
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
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram as any,
        mintPda,
        transferHookProgram as any
      );
      const roles = await sdk.getRoles();
      expect(roles).to.have.property("burner");
      expect(roles).to.have.property("pauser");
      expect(roles).to.have.property("blacklister");
      expect(roles).to.have.property("seizer");
      expect(roles).to.have.property("bump");
      const rolesPda = SolanaStablecoin.getRoleAccountPDA(
        mintPda,
        stablecoinProgram.programId
      );
      const raw = await stablecoinProgram.account.roleAccount.fetch(rolesPda);
      expect(roles.burner.toBase58()).to.equal(raw.burner.toBase58());
      expect(roles.pauser.toBase58()).to.equal(raw.pauser.toBase58());
    });

    it("buildMintInstructions returns createAta + mint when recipient has no ATA", async () => {
      const newUser = anchor.web3.Keypair.generate();
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram as any,
        mintPda,
        transferHookProgram as any
      );
      const instructions = await buildMintInstructions(
        connection,
        sdk,
        authority.publicKey,
        newUser.publicKey,
        100,
        authority.publicKey
      );
      expect(instructions.length).to.equal(2);
      expect(instructions[0].programId.toBase58()).to.include("AToken");
      expect(instructions[1].programId.toBase58()).to.equal(
        stablecoinProgram.programId.toBase58()
      );
    });

    it("buildMintInstructions returns only mint when recipient has ATA", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const sdk = new SolanaStablecoin(
        stablecoinProgram as any,
        mintPda,
        transferHookProgram as any
      );
      const instructions = await buildMintInstructions(
        connection,
        sdk,
        authority.publicKey,
        user1.publicKey,
        50,
        authority.publicKey
      );
      expect(instructions.length).to.equal(1);
      expect(instructions[0].programId.toBase58()).to.equal(
        stablecoinProgram.programId.toBase58()
      );
    });

    it("SolanaStablecoin.load returns instance with getConfig/getTotalSupply", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const loaded = SolanaStablecoin.load(
        stablecoinProgram as any,
        mintPda,
        transferHookProgram as any
      );
      expect(loaded.mintAddress?.toBase58()).to.equal(mintPda.toBase58());
      const config = await loaded.getConfig();
      expect(config.decimals).to.equal(6);
      const supply = await loaded.getTotalSupply();
      expect(typeof supply).to.equal("bigint");
    });
  });
}

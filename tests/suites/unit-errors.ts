import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { SolanaStablecoin, SSSComplianceModule } from "../../sdk/src";
import type { TestContext } from "../context";

export function registerUnitErrorsSuite(ctx: TestContext): void {
  const {
    provider,
    connection,
    authority,
    stablecoinProgram,
    user1,
    user2,
    sss2Sdk,
  } = ctx;

  describe("Unit: instruction error cases", () => {
    it("add_to_blacklist on SSS-1 mint returns ComplianceNotEnabled", async () => {
      const sss1Mint = SolanaStablecoin.getMintPDA(
        "SSS1",
        stablecoinProgram.programId,
      );
      const sss1SdkInstance = new SolanaStablecoin(stablecoinProgram, sss1Mint);
      const complianceSss1 = new SSSComplianceModule(sss1SdkInstance);
      let err: unknown;
      try {
        await complianceSss1
          .addToBlacklist(authority.publicKey, user1.publicKey)
          .then((tx) => tx.rpc());
      } catch (e) {
        err = e;
      }
      expect(err).to.be.ok;
      expect((err as { message?: string }).message).to.include(
        "ComplianceNotEnabled",
      );
    });

    it("burn with non-burner returns Unauthorized", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      sss2Sdk.mintAddress = mintPda;
      let err: unknown;
      try {
        await sss2Sdk
          .burn(user1.publicKey, user1.publicKey, 1)
          .then((tx) => tx.signers([user1]).rpc());
      } catch (e) {
        err = e;
      }
      expect(err).to.be.ok;
      expect((err as { message?: string }).message).to.include("Unauthorized");
    });

    it("mint over daily quota returns QuotaExceeded", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      sss2Sdk.mintAddress = mintPda;
      const extraMinter = anchor.web3.Keypair.generate();
      const airdropSig = await connection.requestAirdrop(
        extraMinter.publicKey,
        anchor.web3.LAMPORTS_PER_SOL,
      );
      const lb = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: airdropSig, ...lb },
        "confirmed",
      );
      await sss2Sdk
        .updateMinter(authority.publicKey, extraMinter.publicKey, true, 100)
        .then((tx) => tx.rpc());
      const extraMinterAta = getAssociatedTokenAddressSync(
        mintPda,
        extraMinter.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );
      try {
        await provider.sendAndConfirm(
          new anchor.web3.Transaction().add(
            createAssociatedTokenAccountInstruction(
              authority.publicKey,
              extraMinterAta,
              extraMinter.publicKey,
              mintPda,
              TOKEN_2022_PROGRAM_ID,
            ),
          ),
        );
      } catch (_) {}
      await sss2Sdk
        .mint(extraMinter.publicKey, extraMinter.publicKey, 100)
        .then((tx) => tx.signers([extraMinter]).rpc());
      let err: unknown;
      try {
        await sss2Sdk
          .mint(extraMinter.publicKey, extraMinter.publicKey, 1)
          .then((tx) => tx.signers([extraMinter]).rpc());
      } catch (e) {
        err = e;
      }
      expect(err).to.be.ok;
      expect((err as { message?: string }).message).to.include(
        "QuotaExceeded",
      );
    });

    it("mint with inactive minter returns MinterInactive", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      sss2Sdk.mintAddress = mintPda;
      const inactiveMinter = anchor.web3.Keypair.generate();
      const airdropSig = await connection.requestAirdrop(
        inactiveMinter.publicKey,
        anchor.web3.LAMPORTS_PER_SOL,
      );
      const lb = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: airdropSig, ...lb },
        "confirmed",
      );
      await sss2Sdk
        .updateMinter(
          authority.publicKey,
          inactiveMinter.publicKey,
          false,
          1e12,
        )
        .then((tx) => tx.rpc());
      let err: unknown;
      try {
        await sss2Sdk
          .mint(inactiveMinter.publicKey, user2.publicKey, 1)
          .then((tx) => tx.signers([inactiveMinter]).rpc());
      } catch (e) {
        err = e;
      }
      expect(err).to.be.ok;
      expect((err as { message?: string }).message).to.include(
        "MinterInactive",
      );
    });
  });
}

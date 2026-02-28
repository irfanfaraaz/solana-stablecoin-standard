import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createTransferCheckedWithTransferHookInstruction,
} from "@solana/spl-token";
import { SolanaStablecoin } from "../../sdk/src";
import type { TestContext } from "../context";

export function registerUnitSuccessSuite(ctx: TestContext): void {
  const {
    connection,
    authority,
    stablecoinProgram,
    transferHookProgram,
    user1,
    user2,
    sss2Sdk,
    complianceSdk,
  } = ctx;

  describe("Unit: instruction success cases", () => {
    it("update_roles updates burner and pauser", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      sss2Sdk.mintAddress = mintPda;
      const rolesBefore = await sss2Sdk.getRoles();
      const newBurner = anchor.web3.Keypair.generate();
      const newPauser = anchor.web3.Keypair.generate();
      await sss2Sdk
        .updateRoles(authority.publicKey, {
          burner: newBurner.publicKey,
          pauser: newPauser.publicKey,
        })
        .then((tx) => tx.rpc());
      const rolesAfter = await sss2Sdk.getRoles();
      expect(rolesAfter.burner.toBase58()).to.equal(
        newBurner.publicKey.toBase58()
      );
      expect(rolesAfter.pauser.toBase58()).to.equal(
        newPauser.publicKey.toBase58()
      );
      await sss2Sdk
        .updateRoles(authority.publicKey, {
          burner: rolesBefore.burner,
          pauser: rolesBefore.pauser,
        })
        .then((tx) => tx.rpc());
    });

    it("configure_minter sets is_active and daily_mint_quota", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      sss2Sdk.mintAddress = mintPda;
      const minterKp = anchor.web3.Keypair.generate();
      const quota = 500;
      await sss2Sdk
        .updateMinter(authority.publicKey, minterKp.publicKey, true, quota)
        .then((tx) => tx.rpc());
      const minterPda = SolanaStablecoin.getMinterPDA(
        mintPda,
        minterKp.publicKey,
        stablecoinProgram.programId
      );
      const minterConfig = await stablecoinProgram.account.minterConfig.fetch(
        minterPda
      );
      expect(minterConfig.isActive).to.be.true;
      expect(Number(minterConfig.dailyMintQuota)).to.equal(quota);
    });

    it("transfer_authority updates master_authority", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const configPda = SolanaStablecoin.getConfigPDA(
        mintPda,
        stablecoinProgram.programId
      );
      const newAuthority = anchor.web3.Keypair.generate();
      const airdropSig = await connection.requestAirdrop(
        newAuthority.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      const lb = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: airdropSig, ...lb },
        "confirmed"
      );
      await stablecoinProgram.methods
        .transferAuthority(newAuthority.publicKey)
        .accounts({
          admin: authority.publicKey,
          config: configPda,
          mint: mintPda,
        } as any)
        .rpc();
      const configAfter =
        await stablecoinProgram.account.stablecoinConfig.fetch(configPda);
      expect(configAfter.masterAuthority.toBase58()).to.equal(
        newAuthority.publicKey.toBase58()
      );
      await stablecoinProgram.methods
        .transferAuthority(authority.publicKey)
        .accounts({
          admin: newAuthority.publicKey,
          config: configPda,
          mint: mintPda,
        } as any)
        .signers([newAuthority])
        .rpc();
    });

    it("freeze_account and thaw_account change token account state", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      sss2Sdk.mintAddress = mintPda;
      const user1Ata = getAssociatedTokenAddressSync(
        mintPda,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      let acc = await getAccount(
        connection,
        user1Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(acc.isFrozen).to.be.false;
      const freezeSig = await sss2Sdk
        .freezeAccount(authority.publicKey, user1.publicKey)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(freezeSig, "confirmed");
      acc = await getAccount(
        connection,
        user1Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(acc.isFrozen).to.be.true;
      const thawSig = await sss2Sdk
        .thawAccount(authority.publicKey, user1.publicKey)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(thawSig, "confirmed");
      acc = await getAccount(
        connection,
        user1Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(acc.isFrozen).to.be.false;
    });

    it("remove_from_blacklist allows transfer after removal", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      sss2Sdk.mintAddress = mintPda;
      await complianceSdk
        .removeFromBlacklist(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
      const user1Ata = getAssociatedTokenAddressSync(
        mintPda,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const user2Ata = getAssociatedTokenAddressSync(
        mintPda,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const transferIx = await createTransferCheckedWithTransferHookInstruction(
        connection,
        user1Ata,
        mintPda,
        user2Ata,
        user1.publicKey,
        BigInt(1),
        6,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const sig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        new anchor.web3.Transaction().add(transferIx),
        [user1]
      );
      expect(sig).to.be.a("string");
    });
  });
}

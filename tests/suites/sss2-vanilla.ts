import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferCheckedWithTransferHookInstruction,
} from "@solana/spl-token";
import {
  SolanaStablecoin,
  SSSComplianceModule,
  SSS_2_PRESET,
} from "../../sdk/src";
import type { TestContext } from "../context";

export function registerSSS2VanillaSuite(ctx: TestContext): void {
  const {
    provider,
    connection,
    authority,
    stablecoinProgram,
    transferHookProgram,
    user1,
    user2,
    sss2Sdk,
    complianceSdk,
  } = ctx;

  describe("SSS-1: Vanilla Stablecoin Operations", () => {
    it("Initializes the SSS-2 Compliant Stablecoin", async () => {
      const config = {
        name: "Superteam USD",
        symbol: "SUSD",
        uri: "https://superteam.fun",
        decimals: 6,
        ...SSS_2_PRESET,
      };
      const txBuilder = await sss2Sdk.initialize(
        authority.publicKey,
        config,
        transferHookProgram.programId
      );
      await txBuilder.rpc();
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const configPda = SolanaStablecoin.getConfigPDA(
        mintPda,
        stablecoinProgram.programId
      );
      const configData = await stablecoinProgram.account.stablecoinConfig.fetch(
        configPda
      );
      expect(configData.enablePermanentDelegate).to.be.true;
      expect(configData.enableTransferHook).to.be.true;
    });

    it("Initializes the Transfer Hook ExtraAccountMetaList", async () => {
      const initHook = await complianceSdk.initializeTransferHookExtraAccounts(
        authority.publicKey
      );
      const sig = await initHook.rpc();
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, ...latestBlockhash },
        "confirmed"
      );
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const extraListPda = SolanaStablecoin.getExtraAccountMetaListPDA(
        mintPda,
        transferHookProgram.programId
      );
      const accInfo = await connection.getAccountInfo(extraListPda);
      expect(accInfo).to.not.be.null;
    });

    it("Mints tokens to user1", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const user1Ata = getAssociatedTokenAddressSync(
        mintPda,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user1Ata,
          user1.publicKey,
          mintPda,
          TOKEN_2022_PROGRAM_ID
        )
      );
      await provider.sendAndConfirm(createAtaTx);
      const confTx = await sss2Sdk.updateMinter(
        authority.publicKey,
        authority.publicKey,
        true,
        1000000000
      );
      await confTx.rpc();
      const mintTx = await sss2Sdk.mint(
        authority.publicKey,
        user1.publicKey,
        1000000
      );
      const sig = await mintTx.rpc();
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, ...latestBlockhash },
        "confirmed"
      );
      const accInfo = await getAccount(
        connection,
        user1Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(accInfo.amount)).to.equal(1000000);
    });

    it("Transfers tokens successfully when not blacklisted", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
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
      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user2Ata,
          user2.publicKey,
          mintPda,
          TOKEN_2022_PROGRAM_ID
        )
      );
      const createSig = await provider.sendAndConfirm(createAtaTx);
      const blockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: createSig, ...blockhash },
        "confirmed"
      );
      const transferInstruction =
        await createTransferCheckedWithTransferHookInstruction(
          connection,
          user1Ata,
          mintPda,
          user2Ata,
          user1.publicKey,
          BigInt(500000),
          6,
          [],
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      const tx = new anchor.web3.Transaction().add(transferInstruction);
      const transferSig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [user1]
      );
      const transferBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: transferSig, ...transferBlockhash },
        "confirmed"
      );
      const accInfoAfter2 = await getAccount(
        connection,
        user2Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(accInfoAfter2.amount)).to.equal(500000);
    });

    it("Adds user2 to Blacklist", async () => {
      await complianceSdk
        .addToBlacklist(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const blacklistPda = SolanaStablecoin.getBlacklistEntryPDA(
        mintPda,
        user2.publicKey,
        stablecoinProgram.programId
      );
      const entry = await stablecoinProgram.account.blacklistEntry.fetch(
        blacklistPda
      );
      expect(entry.isBlacklisted).to.be.true;
    });

    it("Fails to transfer to user2 because user2 is blacklisted", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
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
      const transferInstruction =
        await createTransferCheckedWithTransferHookInstruction(
          connection,
          user1Ata,
          mintPda,
          user2Ata,
          user1.publicKey,
          BigInt(100000),
          6,
          [],
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      const tx = new anchor.web3.Transaction().add(transferInstruction);
      let failed = false;
      try {
        await anchor.web3.sendAndConfirmTransaction(connection, tx, [user1]);
      } catch {
        failed = true;
      }
      expect(failed).to.be.true;
    });

    it("Seizes funds from blacklisted user2 back to authority", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId
      );
      const user2Ata = getAssociatedTokenAddressSync(
        mintPda,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const authorityAta = getAssociatedTokenAddressSync(
        mintPda,
        authority.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      try {
        const createAtaTx = new anchor.web3.Transaction().add(
          createAssociatedTokenAccountInstruction(
            authority.publicKey,
            authorityAta,
            authority.publicKey,
            mintPda,
            TOKEN_2022_PROGRAM_ID
          )
        );
        await provider.sendAndConfirm(createAtaTx);
      } catch (e) {
        // Ignore if already exists
      }
      const seizeTx = await complianceSdk.seize(
        authority.publicKey,
        user2.publicKey,
        authority.publicKey,
        500000
      );
      const seizeSig = await seizeTx.rpc();
      const seizeBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: seizeSig, ...seizeBlockhash },
        "finalized"
      );
      const accInfo2 = await getAccount(
        connection,
        user2Ata,
        "finalized",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(accInfo2.amount)).to.equal(0);
      const accInfoAuth = await getAccount(
        connection,
        authorityAta,
        "finalized",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(accInfoAuth.amount)).to.equal(500000);
    });

    it("Thaws account (no-op visual test)", async () => {
      await sss2Sdk
        .freezeAccount(authority.publicKey, user1.publicKey)
        .then((tx) => tx.rpc());
      await sss2Sdk
        .thawAccount(authority.publicKey, user1.publicKey)
        .then((tx) => tx.rpc());
    });

    it("Pauses and Unpauses the stablecoin entirely", async () => {
      await sss2Sdk.pause(authority.publicKey).then((tx) => tx.rpc());
      const mintTx = await sss2Sdk.mint(
        authority.publicKey,
        user1.publicKey,
        100000
      );
      let failed = false;
      try {
        await mintTx.rpc();
      } catch (e: any) {
        failed = true;
        expect(e.message).to.include("ProgramPaused");
      }
      expect(failed).to.be.true;
      await sss2Sdk.unpause(authority.publicKey).then((tx) => tx.rpc());
      await mintTx.rpc();
    });
  });
}

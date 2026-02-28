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
  SSS_3_PRESET,
  SSS3ConfidentialModule,
} from "../../sdk/src";
import type { TestContext } from "../context";

export function registerSSS3AllowlistSuite(ctx: TestContext): void {
  const {
    provider,
    connection,
    authority,
    stablecoinProgram,
    transferHookProgram,
    user1,
    user2,
  } = ctx;

  describe("SSS-3: Allowlist (POC)", () => {
    const PUSD_SYMBOL = "PUSD";
    let sss3Sdk: SolanaStablecoin;
    let pusdMint: anchor.web3.PublicKey;

    it("Initializes SSS-3 stablecoin (confidential + allowlist)", async () => {
      const config = {
        name: "Private USD",
        symbol: PUSD_SYMBOL,
        uri: "https://example.com/sss3",
        decimals: 6,
        ...SSS_3_PRESET,
      };
      const sdk = new SolanaStablecoin(
        stablecoinProgram,
        undefined,
        transferHookProgram
      );
      const txBuilder = await sdk.initialize(
        authority.publicKey,
        config,
        transferHookProgram.programId
      );
      await txBuilder.rpc();
      pusdMint = SolanaStablecoin.getMintPDA(
        PUSD_SYMBOL,
        stablecoinProgram.programId
      );
      sss3Sdk = new SolanaStablecoin(
        stablecoinProgram,
        pusdMint,
        transferHookProgram
      );
      const configPda = SolanaStablecoin.getConfigPDA(
        pusdMint,
        stablecoinProgram.programId
      );
      const configData = await stablecoinProgram.account.stablecoinConfig.fetch(
        configPda
      );
      expect(configData.enableTransferHook).to.be.true;
      expect(configData.enableAllowlist).to.be.true;
      expect(configData.enableConfidentialTransfers).to.be.true;
    });

    it("Initializes transfer hook extra accounts with allowlist", async () => {
      const compliance = new SSSComplianceModule(sss3Sdk);
      const initHook = await compliance.initializeTransferHookExtraAccounts(
        authority.publicKey,
        true
      );
      const sig = await initHook.rpc();
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, ...latestBlockhash },
        "confirmed"
      );
      const extraListPda = SolanaStablecoin.getExtraAccountMetaListPDA(
        pusdMint,
        transferHookProgram.programId
      );
      const accInfo = await connection.getAccountInfo(extraListPda);
      expect(accInfo).to.not.be.null;
    });

    it("add_to_allowlist and remove_from_allowlist (master authority)", async () => {
      const addTx = await sss3Sdk.addToAllowlist(
        authority.publicKey,
        user1.publicKey
      );
      const addSig = await addTx.rpc();
      await connection.confirmTransaction(
        {
          signature: addSig,
          ...(await connection.getLatestBlockhash()),
        },
        "confirmed"
      );
      const allowlistPda = SolanaStablecoin.getAllowlistEntryPDA(
        pusdMint,
        user1.publicKey,
        stablecoinProgram.programId
      );
      const entry = await stablecoinProgram.account.allowlistEntry.fetch(
        allowlistPda
      );
      expect(entry.wallet.equals(user1.publicKey)).to.be.true;
      expect(entry.isAllowed).to.be.true;
      const removeTx = await sss3Sdk.removeFromAllowlist(
        authority.publicKey,
        user1.publicKey
      );
      const removeSig = await removeTx.rpc();
      await connection.confirmTransaction(
        {
          signature: removeSig,
          ...(await connection.getLatestBlockhash()),
        },
        "confirmed"
      );
      const entryAfter = await stablecoinProgram.account.allowlistEntry.fetch(
        allowlistPda
      );
      expect(entryAfter.isAllowed).to.be.false;
    });

    it("transfer fails when destination is not on allowlist, then succeeds after adding", async () => {
      const addUser1Sig = await sss3Sdk
        .addToAllowlist(authority.publicKey, user1.publicKey)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(
        { signature: addUser1Sig, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
      const addUser2Sig = await sss3Sdk
        .addToAllowlist(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(
        { signature: addUser2Sig, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
      const removeUser2Sig = await sss3Sdk
        .removeFromAllowlist(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(
        {
          signature: removeUser2Sig,
          ...(await connection.getLatestBlockhash()),
        },
        "confirmed"
      );
      const user1PusdAta = getAssociatedTokenAddressSync(
        pusdMint,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const user2PusdAta = getAssociatedTokenAddressSync(
        pusdMint,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user1PusdAta,
          user1.publicKey,
          pusdMint,
          TOKEN_2022_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user2PusdAta,
          user2.publicKey,
          pusdMint,
          TOKEN_2022_PROGRAM_ID
        )
      );
      await provider.sendAndConfirm(createAtaTx);
      await sss3Sdk
        .updateMinter(authority.publicKey, authority.publicKey, true, 1e12)
        .then((tx) => tx.rpc());
      const mintSig = await sss3Sdk
        .mint(authority.publicKey, user1.publicKey, 100_000)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(
        { signature: mintSig, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
      const user1AfterMint = await getAccount(
        connection,
        user1PusdAta,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(user1AfterMint.amount)).to.equal(100_000);
      const transferFailIx =
        await createTransferCheckedWithTransferHookInstruction(
          connection,
          user1PusdAta,
          pusdMint,
          user2PusdAta,
          user1.publicKey,
          BigInt(50_000),
          6,
          [],
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      const txFail = new anchor.web3.Transaction().add(transferFailIx);
      let transferBlocked = false;
      let errMsg = "";
      try {
        await anchor.web3.sendAndConfirmTransaction(connection, txFail, [
          user1,
        ]);
      } catch (e: any) {
        transferBlocked = true;
        errMsg = e?.message ?? e?.toString?.() ?? String(e);
      }
      expect(transferBlocked).to.be.true;
      expect(errMsg).to.match(
        /NotOnAllowlist|not on the allowlist|0x1771|6001/i
      );
      const user1AfterBlocked = await getAccount(
        connection,
        user1PusdAta,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      const user2AfterBlocked = await getAccount(
        connection,
        user2PusdAta,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(user1AfterBlocked.amount)).to.equal(100_000);
      expect(Number(user2AfterBlocked.amount)).to.equal(0);
      const add2Sig = await sss3Sdk
        .addToAllowlist(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
      await connection.confirmTransaction(
        { signature: add2Sig, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
      const transferOkIx =
        await createTransferCheckedWithTransferHookInstruction(
          connection,
          user1PusdAta,
          pusdMint,
          user2PusdAta,
          user1.publicKey,
          BigInt(50_000),
          6,
          [],
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      const transferOkSig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        new anchor.web3.Transaction().add(transferOkIx),
        [user1]
      );
      await connection.confirmTransaction(transferOkSig, "finalized");
      const transferOkStatus = await connection.getSignatureStatus(
        transferOkSig,
        { searchTransactionHistory: true }
      );
      expect(transferOkStatus.value?.err ?? null).to.equal(null);
      const user2Acc = await getAccount(
        connection,
        user2PusdAta,
        "finalized",
        TOKEN_2022_PROGRAM_ID
      );
      const user1Acc = await getAccount(
        connection,
        user1PusdAta,
        "finalized",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(user1Acc.amount)).to.equal(50_000);
      expect(Number(user2Acc.amount)).to.equal(50_000);
    });

    it("getConfidential returns SSS3ConfidentialModule and fundConfidential rejects when not on allowlist", async () => {
      const confidential = sss3Sdk.getConfidential();
      expect(confidential).to.be.instanceOf(SSS3ConfidentialModule);
      const notAllowlistedWallet = anchor.web3.Keypair.generate().publicKey;
      let thrown = false;
      try {
        await confidential.fundConfidential(notAllowlistedWallet, 1_000, 6);
      } catch (e: any) {
        thrown = true;
        expect(e?.message ?? String(e)).to.match(
          /not on allowlist|cannot fund confidential/i
        );
      }
      expect(thrown).to.be.true;
    });

    it("fundConfidential builds deposit instruction when wallet is on allowlist", async () => {
      await sss3Sdk
        .addToAllowlist(authority.publicKey, user1.publicKey)
        .then((tx) => tx.rpc());
      const confidential = sss3Sdk.getConfidential();
      const ix = await confidential.fundConfidential(
        user1.publicKey,
        10_000,
        6
      );
      expect(ix.programId.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
      expect(ix.keys.length).to.equal(3);
      expect(ix.data.length).to.be.greaterThan(0);
      const user1Ata = getAssociatedTokenAddressSync(
        pusdMint,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      expect(ix.keys[0].pubkey.equals(user1Ata)).to.be.true;
      expect(ix.keys[1].pubkey.equals(pusdMint)).to.be.true;
      expect(ix.keys[2].pubkey.equals(user1.publicKey)).to.be.true;
      expect(ix.keys[2].isSigner).to.be.true;
    });

    it("applyPending builds instruction with caller-supplied data", () => {
      const confidential = sss3Sdk.getConfidential();
      const dummyData = new Uint8Array(32);
      const ix = confidential.applyPending(user1.publicKey, dummyData);
      expect(ix.programId.equals(TOKEN_2022_PROGRAM_ID)).to.be.true;
      expect(ix.keys.length).to.equal(2);
      expect(ix.keys[0].isWritable).to.be.true;
      expect(ix.keys[1].isSigner).to.be.true;
    });
  });
}

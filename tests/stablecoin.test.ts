import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferCheckedWithTransferHookInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  SolanaStablecoin,
  SSSComplianceModule,
  SSS_1_PRESET,
  SSS_2_PRESET,
} from "../sdk/src";
import type { Stablecoin } from "../target/types/stablecoin";
import type { TransferHook } from "../target/types/transfer_hook";

describe("solana-stablecoin-standard", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const authority = provider.wallet as anchor.Wallet;

  console.log("Workspace Keys:", Object.keys(anchor.workspace));
  const stablecoinProgram = anchor.workspace.Stablecoin as Program<Stablecoin>;
  const transferHookProgram = anchor.workspace
    .TransferHook as Program<TransferHook>;
  console.log("Stablecoin Program ID:", stablecoinProgram.programId.toBase58());
  console.log(
    "Transfer Hook Program ID:",
    transferHookProgram?.programId?.toBase58(),
  );

  // Wrapper SDKs
  const sss1Sdk = new SolanaStablecoin(stablecoinProgram);
  const sss2Sdk = new SolanaStablecoin(
    stablecoinProgram,
    undefined,
    transferHookProgram,
  );
  const complianceSdk = new SSSComplianceModule(sss2Sdk);

  // Test Accounts
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop some SOL to users
    const airdrop1 = await connection.requestAirdrop(
      user1.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL,
    );
    const airdrop2 = await connection.requestAirdrop(
      user2.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL,
    );

    // confirm airdrop
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdrop1,
    });
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdrop2,
    });
  });

  describe("SSS-1: Vanilla Stablecoin Operations", () => {
    // Note: Due to PDA collision logic, we can only initialize the stablecoin once globally per program ID
    // So we'll test SSS-2 (which has all features) since it's an additive superset.
    // Wait, let's actually just test the SSS-2 preset because it covers all SSS-1 functionality, plus compliance.

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
        transferHookProgram.programId,
      );

      await txBuilder.rpc();

      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const configPda = SolanaStablecoin.getConfigPDA(
        mintPda,
        stablecoinProgram.programId,
      );

      const configData = await stablecoinProgram.account.stablecoinConfig.fetch(
        configPda,
      );
      expect(configData.enablePermanentDelegate).to.be.true;
      expect(configData.enableTransferHook).to.be.true;
    });

    it("Initializes the Transfer Hook ExtraAccountMetaList", async () => {
      const initHook = await complianceSdk.initializeTransferHookExtraAccounts(
        authority.publicKey,
      );
      const sig = await initHook.rpc();

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature: sig,
          ...latestBlockhash,
        },
        "confirmed",
      );

      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const extraListPda = SolanaStablecoin.getExtraAccountMetaListPDA(
        mintPda,
        transferHookProgram.programId,
      );
      const accInfo = await connection.getAccountInfo(extraListPda);
      expect(accInfo).to.not.be.null;
    });

    it("Mints tokens to user1", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const user1Ata = getAssociatedTokenAddressSync(
        mintPda,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user1Ata,
          user1.publicKey,
          mintPda,
          TOKEN_2022_PROGRAM_ID,
        ),
      );
      await provider.sendAndConfirm(createAtaTx);

      const confTx = await sss2Sdk.updateMinter(
        authority.publicKey,
        authority.publicKey,
        true,
        1000000000,
      );
      await confTx.rpc();

      const mintTx = await sss2Sdk.mint(
        authority.publicKey,
        user1.publicKey,
        1000000,
      ); // 1.0 SUSD
      const sig = await mintTx.rpc();

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature: sig,
          ...latestBlockhash,
        },
        "confirmed",
      );

      const accInfo = await getAccount(
        connection,
        user1Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID,
      );
      expect(Number(accInfo.amount)).to.equal(1000000);
    });

    it("Transfers tokens successfully when not blacklisted", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const user1Ata = getAssociatedTokenAddressSync(
        mintPda,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );
      const user2Ata = getAssociatedTokenAddressSync(
        mintPda,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user2Ata,
          user2.publicKey,
          mintPda,
          TOKEN_2022_PROGRAM_ID,
        ),
      );
      await provider.sendAndConfirm(createAtaTx);

      // We use createTransferCheckedWithTransferHookInstruction
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
          TOKEN_2022_PROGRAM_ID,
        );

      console.log("Transfer Instruction Keys:");
      for (const key of transferInstruction.keys) {
        console.log(
          `  Pubkey: ${key.pubkey.toBase58()} (isSigner: ${
            key.isSigner
          }, isWritable: ${key.isWritable})`,
        );
      }

      const accInfoBefore = await getAccount(
        connection,
        user1Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("User1 Balance BEFORE: ", Number(accInfoBefore.amount));

      const tx = new anchor.web3.Transaction().add(transferInstruction);
      const transferSig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [user1],
      );
      const transferBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature: transferSig,
          ...transferBlockhash,
        },
        "finalized",
      );

      const accInfoAfter1 = await getAccount(
        connection,
        user1Ata,
        "finalized",
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("User1 Balance AFTER: ", Number(accInfoAfter1.amount));

      const accInfoAfter2 = await getAccount(
        connection,
        user2Ata,
        "finalized",
        TOKEN_2022_PROGRAM_ID,
      );
      console.log("User2 Balance AFTER: ", Number(accInfoAfter2.amount));

      expect(Number(accInfoAfter2.amount)).to.equal(500000);
    });

    it("Adds user2 to Blacklist", async () => {
      const addBlacklistTx = await complianceSdk.addToBlacklist(
        authority.publicKey,
        user2.publicKey,
      );
      await addBlacklistTx.rpc();

      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const blacklistPda = SolanaStablecoin.getBlacklistEntryPDA(
        mintPda,
        user2.publicKey,
        stablecoinProgram.programId,
      );
      const entry = await stablecoinProgram.account.blacklistEntry.fetch(
        blacklistPda,
      );
      expect(entry.isBlacklisted).to.be.true;
    });

    it("Fails to transfer to user2 because user2 is blacklisted", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const user1Ata = getAssociatedTokenAddressSync(
        mintPda,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );
      const user2Ata = getAssociatedTokenAddressSync(
        mintPda,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
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
          TOKEN_2022_PROGRAM_ID,
        );

      const tx = new anchor.web3.Transaction().add(transferInstruction);
      let failed = false;
      try {
        await anchor.web3.sendAndConfirmTransaction(connection, tx, [user1]);
      } catch (e) {
        failed = true;
      }
      expect(failed).to.be.true;
    });

    it("Seizes funds from blacklisted user2 back to authority", async () => {
      const mintPda = SolanaStablecoin.getMintPDA(
        "SUSD",
        stablecoinProgram.programId,
      );
      const user2Ata = getAssociatedTokenAddressSync(
        mintPda,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );
      const authorityAta = getAssociatedTokenAddressSync(
        mintPda,
        authority.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      // Make sure authority has an ATA
      try {
        const createAtaTx = new anchor.web3.Transaction().add(
          createAssociatedTokenAccountInstruction(
            authority.publicKey,
            authorityAta,
            authority.publicKey,
            mintPda,
            TOKEN_2022_PROGRAM_ID,
          ),
        );
        await provider.sendAndConfirm(createAtaTx);
      } catch (e) {} // Ignore if already exists

      // Check balance before seizing
      const accInfoBeforeSeize = await getAccount(
        connection,
        user2Ata,
        "confirmed",
        TOKEN_2022_PROGRAM_ID,
      );
      console.log(
        "User2 Balance BEFORE Seize: ",
        Number(accInfoBeforeSeize.amount),
      );

      // Seize 500000
      const seizeTx = await complianceSdk.seize(
        authority.publicKey,
        user2.publicKey,
        authority.publicKey,
        500000,
      );
      const seizeSig = await seizeTx.rpc();
      const seizeBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature: seizeSig,
          ...seizeBlockhash,
        },
        "finalized",
      );

      const accInfo2 = await getAccount(
        connection,
        user2Ata,
        "finalized",
        TOKEN_2022_PROGRAM_ID,
      );
      expect(Number(accInfo2.amount)).to.equal(0);

      const accInfoAuth = await getAccount(
        connection,
        authorityAta,
        "finalized",
        TOKEN_2022_PROGRAM_ID,
      );
      expect(Number(accInfoAuth.amount)).to.equal(500000);
    });

    it("Thaws account (no-op visual test)", async () => {
      // Thaw / freeze tests essentially just call CPI
      const freezeTx = await sss2Sdk.freezeAccount(
        authority.publicKey,
        user1.publicKey,
      );
      await freezeTx.rpc();

      const thawTx = await sss2Sdk.thawAccount(
        authority.publicKey,
        user1.publicKey,
      );
      await thawTx.rpc();
    });

    it("Pauses and Unpauses the stablecoin entirely", async () => {
      const pauseTx = await sss2Sdk.pause(authority.publicKey);
      await pauseTx.rpc();

      // Should fail to mint
      const mintTx = await sss2Sdk.mint(
        authority.publicKey,
        user1.publicKey,
        100000,
      );
      let failed = false;
      try {
        await mintTx.rpc();
      } catch (e) {
        failed = true;
        console.log("Pause test threw error:", e.message);
        expect(e.message).to.include("ProgramPaused");
      }
      expect(failed).to.be.true;

      const unpauseTx = await sss2Sdk.unpause(authority.publicKey);
      await unpauseTx.rpc();

      // Mint works again
      await mintTx.rpc();
    });
  });

  describe("SSS-1: integration (mint → transfer → freeze → thaw)", () => {
    const SSS1_SYMBOL = "SSS1";
    let sss1Mint: anchor.web3.PublicKey;
    let sss1Sdk: SolanaStablecoin;

    it("Initializes SSS-1 stablecoin (no hook, no permanent delegate)", async () => {
      const config = {
        name: "SSS1 Minimal",
        symbol: SSS1_SYMBOL,
        uri: "https://example.com/sss1",
        decimals: 6,
        ...SSS_1_PRESET,
      };
      const noMintSdk = new SolanaStablecoin(stablecoinProgram);
      const txBuilder = await noMintSdk.initialize(
        authority.publicKey,
        config,
        undefined,
      );
      await txBuilder.rpc();
      sss1Mint = SolanaStablecoin.getMintPDA(
        SSS1_SYMBOL,
        stablecoinProgram.programId,
      );
      sss1Sdk = new SolanaStablecoin(stablecoinProgram, sss1Mint);

      const configPda = SolanaStablecoin.getConfigPDA(
        sss1Mint,
        stablecoinProgram.programId,
      );
      const configData = await stablecoinProgram.account.stablecoinConfig.fetch(
        configPda,
      );
      expect(configData.enableTransferHook).to.be.false;
      expect(configData.enablePermanentDelegate).to.be.false;
    });

    it("Mints and transfers (plain SPL, no hook), then freeze and thaw", async () => {
      const user1Ata = getAssociatedTokenAddressSync(
        sss1Mint,
        user1.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );
      const user2Ata = getAssociatedTokenAddressSync(
        sss1Mint,
        user2.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
      );

      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user1Ata,
          user1.publicKey,
          sss1Mint,
          TOKEN_2022_PROGRAM_ID,
        ),
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          user2Ata,
          user2.publicKey,
          sss1Mint,
          TOKEN_2022_PROGRAM_ID,
        ),
      );
      await provider.sendAndConfirm(createAtaTx);

      await sss1Sdk
        .updateMinter(authority.publicKey, authority.publicKey, true, 1e12)
        .then((tx) => tx.rpc());

      const mintSig = await sss1Sdk
        .mint(authority.publicKey, user1.publicKey, 500000)
        .then((tx) => tx.rpc());
      const mintBlock = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: mintSig, ...mintBlock },
        "finalized",
      );

      let acc = await getAccount(
        connection,
        user1Ata,
        "finalized",
        TOKEN_2022_PROGRAM_ID,
      );
      expect(Number(acc.amount)).to.equal(500000);

      const transferIx = createTransferCheckedInstruction(
        user1Ata,
        sss1Mint,
        user2Ata,
        user1.publicKey,
        200000,
        6,
        [],
        TOKEN_2022_PROGRAM_ID,
      );
      const transferSig = await anchor.web3.sendAndConfirmTransaction(
        connection,
        new anchor.web3.Transaction().add(transferIx),
        [user1],
      );
      const transferBlock = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: transferSig, ...transferBlock },
        "finalized",
      );

      acc = await getAccount(
        connection,
        user2Ata,
        "finalized",
        TOKEN_2022_PROGRAM_ID,
      );
      expect(Number(acc.amount)).to.equal(200000);

      await sss1Sdk
        .freezeAccount(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
      await sss1Sdk
        .thawAccount(authority.publicKey, user2.publicKey)
        .then((tx) => tx.rpc());
    });
  });

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
      await connection.confirmTransaction({ signature: airdropSig, ...lb }, "confirmed");
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
      await connection.confirmTransaction({ signature: airdropSig, ...lb }, "confirmed");
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
});

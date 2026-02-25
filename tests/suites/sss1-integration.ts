import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { SolanaStablecoin, SSS_1_PRESET } from "../../sdk/src";
import type { TestContext } from "../context";

export function registerSSS1IntegrationSuite(ctx: TestContext): void {
  const { provider, connection, authority, stablecoinProgram, user1, user2 } =
    ctx;

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
}

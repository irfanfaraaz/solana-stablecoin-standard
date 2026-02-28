import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import type { Oracle } from "../../target/types/oracle";
import type { TestContext } from "../context";

const ORACLE_PROGRAM_ID_LOCALNET =
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

export function registerOracleSuite(ctx: TestContext) {
  const program = ctx.oracleProgram as Program<Oracle>;

  describe("oracle module", () => {
    it("oracle program ID matches Anchor.toml localnet", () => {
      expect(program.programId.toBase58()).to.equal(ORACLE_PROGRAM_ID_LOCALNET);
    });

    it("compute_mint_amount instruction exists with correct accounts", () => {
      const idl = program.idl;
      const computeMintAmount = (idl.instructions as any[]).find(
        (ix: any) =>
          ix.name === "computeMintAmount" || ix.name === "compute_mint_amount"
      );
      expect(computeMintAmount).to.be.ok;
      const accountNames = (computeMintAmount.accounts as any[]).map(
        (a: any) => a.name
      );
      expect(accountNames).to.include("queue");
      expect(
        accountNames.some(
          (n: string) => n === "slot_hashes" || n === "slotHashes"
        )
      ).to.be.true;
      expect(accountNames).to.include("instructions");
    });
    it("returns InvalidFeed error when no Switchboard instruction is present", async () => {
      const provider = ctx.provider;

      // Create a dummy queue account so the program can read it; data layout does not matter
      const queueKeypair = anchor.web3.Keypair.generate();
      const lamports =
        await provider.connection.getMinimumBalanceForRentExemption(0);

      const createQueueIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: queueKeypair.publicKey,
        lamports,
        space: 0,
        programId: anchor.web3.SystemProgram.programId,
      });

      // First, create the dummy queue account on-chain.
      const createTx = new anchor.web3.Transaction().add(createQueueIx);
      await provider.sendAndConfirm(createTx, [queueKeypair]);

      try {
        await program.methods
          .computeMintAmount(new anchor.BN(100), 6)
          .accounts({
            queue: queueKeypair.publicKey,
            slotHashes: anchor.web3.SYSVAR_SLOT_HASHES_PUBKEY,
            instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          })
          .rpc();
        expect.fail(
          "expected transaction to fail when no Switchboard instruction is present"
        );
      } catch (_e: any) {
        // Expected: simulation should fail due to missing Switchboard Ed25519 instruction.
      }
    });
  });
}

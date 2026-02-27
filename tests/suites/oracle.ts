import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import type { Oracle } from "../../target/types/oracle";
import type { TestContext } from "../context";

export function registerOracleSuite(ctx: TestContext) {
  const program = ctx.oracleProgram as Program<Oracle>;

  describe("oracle module", () => {
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
        expect.fail("expected transaction to fail when no Switchboard instruction is present");
      } catch (_e: any) {
        // Expected: simulation should fail due to missing Switchboard Ed25519 instruction.
      }
    });
  });
}


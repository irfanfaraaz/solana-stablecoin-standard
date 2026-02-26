/**
 * SSS-3 Confidential transfer module (allowlist-gated).
 * Builds SPL Token-2022 confidential transfer instructions.
 * Proof generation is out-of-repo: caller supplies instruction data / proof for
 * configure, apply pending, transfer, and withdraw.
 */

import {
  PublicKey,
  TransactionInstruction,
  AccountMeta,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { SolanaStablecoin } from "./core";

// Static PDA helper used for allowlist check
import { SolanaStablecoin as StablecoinClass } from "./core";

/** Confidential transfer sub-instruction discriminators (SPL Token-2022). */
const ConfidentialTransferInstruction = {
  ConfigureAccount: 2,
  Deposit: 5,
  Withdraw: 6,
  Transfer: 7,
  ApplyPendingBalance: 8,
} as const;

/**
 * Build the outer Token-2022 extension instruction data:
 * [TokenInstruction.ConfidentialTransferExtension, ConfidentialTransferInstruction.*, ...rest]
 */
function buildConfidentialInstructionData(
  subInstruction: number,
  rest: Uint8Array
): Buffer {
  const buf = Buffer.alloc(1 + 1 + rest.length);
  buf.writeUInt8(27, 0); // TokenInstruction.ConfidentialTransferExtension
  buf.writeUInt8(subInstruction, 1);
  buf.set(rest, 2);
  return buf;
}

/**
 * SSS-3 confidential operations. Requires mint with ConfidentialTransferMint
 * and (when allowlist enabled) allowlist check before deposit.
 */
export class SSS3ConfidentialModule {
  constructor(
    private sdk: SolanaStablecoin,
    private mint: PublicKey,
    private tokenProgramId: PublicKey = TOKEN_2022_PROGRAM_ID
  ) {}

  /**
   * One-time setup for an ATA for confidential transfers.
   * Caller must supply instruction data (and optional extra accounts for proof)
   * from their proof flow or ConfigureAccountWithRegistry.
   */
  configureConfidentialAccount(
    owner: PublicKey,
    instructionData: Uint8Array,
    tokenAccount?: PublicKey,
    extraAccounts: AccountMeta[] = []
  ): TransactionInstruction {
    const token = tokenAccount ?? getAssociatedTokenAddressSync(
      this.mint,
      owner,
      true,
      this.tokenProgramId
    );
    const keys: AccountMeta[] = [
      { pubkey: token, isSigner: false, isWritable: true },
      { pubkey: this.mint, isSigner: false, isWritable: false },
      ...extraAccounts,
      { pubkey: owner, isSigner: true, isWritable: false },
    ];
    const data = buildConfidentialInstructionData(
      ConfidentialTransferInstruction.ConfigureAccount,
      instructionData
    );
    return new TransactionInstruction({
      programId: this.tokenProgramId,
      keys,
      data,
    });
  }

  /**
   * Move public balance into confidential pending balance.
   * When mint has allowlist enabled, throws if owner is not on allowlist.
   */
  async fundConfidential(
    owner: PublicKey,
    amount: number | bigint,
    decimals: number,
    tokenAccount?: PublicKey
  ): Promise<TransactionInstruction> {
    const config = await this.sdk.getConfig();
    if (config.enableAllowlist) {
      const allowlistPda = StablecoinClass.getAllowlistEntryPDA(
        this.mint,
        owner,
        this.sdk.program.programId
      );
      try {
        const entry = await this.sdk.program.account.allowlistEntry.fetch(
          allowlistPda
        );
        if (!entry?.isAllowed) {
          throw new Error("SSS-3: wallet is not on allowlist; cannot fund confidential");
        }
      } catch {
        throw new Error("SSS-3: wallet is not on allowlist; cannot fund confidential");
      }
    }

    const token = tokenAccount ?? getAssociatedTokenAddressSync(
      this.mint,
      owner,
      true,
      this.tokenProgramId
    );
    const amountNum = typeof amount === "bigint" ? Number(amount) : amount;
    const dataRest = Buffer.alloc(9);
    dataRest.writeBigUInt64LE(BigInt(amountNum), 0);
    dataRest.writeUInt8(decimals, 8);
    const data = buildConfidentialInstructionData(
      ConfidentialTransferInstruction.Deposit,
      dataRest
    );
    return new TransactionInstruction({
      programId: this.tokenProgramId,
      keys: [
        { pubkey: token, isSigner: false, isWritable: true },
        { pubkey: this.mint, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      data,
    });
  }

  /**
   * Apply pending balance to available confidential balance.
   * Caller must supply instruction data from their decryption/proof flow.
   */
  applyPending(
    owner: PublicKey,
    instructionData: Uint8Array,
    tokenAccount?: PublicKey
  ): TransactionInstruction {
    const token = tokenAccount ?? getAssociatedTokenAddressSync(
      this.mint,
      owner,
      true,
      this.tokenProgramId
    );
    const data = buildConfidentialInstructionData(
      ConfidentialTransferInstruction.ApplyPendingBalance,
      instructionData
    );
    return new TransactionInstruction({
      programId: this.tokenProgramId,
      keys: [
        { pubkey: token, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      data,
    });
  }

  /**
   * Confidential transfer from source to destination.
   * Caller supplies instruction data (encrypted amount + proof encoding)
   * and optional extra accounts (e.g. proof context accounts).
   */
  confidentialTransfer(
    sourceOwner: PublicKey,
    destOwner: PublicKey,
    instructionData: Uint8Array,
    extraAccounts: AccountMeta[] = []
  ): TransactionInstruction {
    const sourceToken = getAssociatedTokenAddressSync(
      this.mint,
      sourceOwner,
      true,
      this.tokenProgramId
    );
    const destToken = getAssociatedTokenAddressSync(
      this.mint,
      destOwner,
      true,
      this.tokenProgramId
    );
    const keys: AccountMeta[] = [
      { pubkey: sourceToken, isSigner: false, isWritable: true },
      { pubkey: this.mint, isSigner: false, isWritable: false },
      { pubkey: destToken, isSigner: false, isWritable: true },
      ...extraAccounts,
      { pubkey: sourceOwner, isSigner: true, isWritable: false },
    ];
    const data = buildConfidentialInstructionData(
      ConfidentialTransferInstruction.Transfer,
      instructionData
    );
    return new TransactionInstruction({
      programId: this.tokenProgramId,
      keys,
      data,
    });
  }

  /**
   * Withdraw from confidential available balance to public balance.
   * Caller supplies instruction data (amount + proof encoding) and optional
   * extra accounts (e.g. proof context accounts).
   */
  withdrawConfidential(
    owner: PublicKey,
    instructionData: Uint8Array,
    extraAccounts: AccountMeta[] = [],
    tokenAccount?: PublicKey
  ): TransactionInstruction {
    const token = tokenAccount ?? getAssociatedTokenAddressSync(
      this.mint,
      owner,
      true,
      this.tokenProgramId
    );
    const keys: AccountMeta[] = [
      { pubkey: token, isSigner: false, isWritable: true },
      { pubkey: this.mint, isSigner: false, isWritable: false },
      ...extraAccounts,
      { pubkey: owner, isSigner: true, isWritable: false },
    ];
    const data = buildConfidentialInstructionData(
      ConfidentialTransferInstruction.Withdraw,
      instructionData
    );
    return new TransactionInstruction({
      programId: this.tokenProgramId,
      keys,
      data,
    });
  }
}


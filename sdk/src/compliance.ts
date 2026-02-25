import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "./core";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export class SSSComplianceModule {
  private sdk: SolanaStablecoin;

  constructor(sdk: SolanaStablecoin) {
    this.sdk = sdk;
  }

  /**
   * Add an account to the blacklist. Optionally pass a reason for audit/logging (not stored on-chain).
   */
  async addToBlacklist(
    authority: PublicKey,
    accountToBlacklist: PublicKey,
    reason?: string,
  ) {
    if (!this.sdk.mintAddress) throw new Error("Mint not set");
    const mint = this.sdk.mintAddress;
    const config = SolanaStablecoin.getConfigPDA(
      mint,
      this.sdk.program.programId,
    );
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.sdk.program.programId,
    );
    const blacklistEntry = SolanaStablecoin.getBlacklistEntryPDA(
      mint,
      accountToBlacklist,
      this.sdk.program.programId,
    );

    return this.sdk.program.methods.addToBlacklist().accounts({
      blacklister: authority,
      config,
      roles: roleAccount,
      targetAccount: accountToBlacklist,
      blacklistEntry,
      mint,
      systemProgram: SystemProgram.programId,
    } as any);
  }

  async removeFromBlacklist(
    authority: PublicKey,
    accountToUnblacklist: PublicKey,
  ) {
    if (!this.sdk.mintAddress) throw new Error("Mint not set");
    const mint = this.sdk.mintAddress;
    const config = SolanaStablecoin.getConfigPDA(
      mint,
      this.sdk.program.programId,
    );
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.sdk.program.programId,
    );
    const blacklistEntry = SolanaStablecoin.getBlacklistEntryPDA(
      mint,
      accountToUnblacklist,
      this.sdk.program.programId,
    );

    return this.sdk.program.methods.removeFromBlacklist().accounts({
      blacklister: authority,
      config,
      roles: roleAccount,
      targetAccount: accountToUnblacklist,
      blacklistEntry,
      mint,
    } as any);
  }

  async seize(
    authority: PublicKey,
    from: PublicKey,
    to: PublicKey,
    amount: number | string,
  ) {
    if (!this.sdk.mintAddress) throw new Error("Mint not set");
    const mint = this.sdk.mintAddress;
    const config = SolanaStablecoin.getConfigPDA(
      mint,
      this.sdk.program.programId,
    );
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.sdk.program.programId,
    );
    const sourceBlacklist = SolanaStablecoin.getBlacklistEntryPDA(
      mint,
      from,
      this.sdk.program.programId,
    );
    const destBlacklist = SolanaStablecoin.getBlacklistEntryPDA(
      mint,
      to,
      this.sdk.program.programId,
    );

    const sourceAta = getAssociatedTokenAddressSync(
      mint,
      from,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    const destinationAta = getAssociatedTokenAddressSync(
      mint,
      to,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    const extraMetaList = SolanaStablecoin.getExtraAccountMetaListPDA(
      mint,
      this.sdk.transferHookProgram!.programId,
    );

    return this.sdk.program.methods.seize(new BN(amount)).accounts({
      seizer: authority,
      fromAccount: sourceAta,
      toAccount: destinationAta,
      mint,
      config,
      roles: roleAccount,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      transferHookProgram: this.sdk.transferHookProgram!.programId,
      extraMetaList,
      stablecoinProgram: this.sdk.program.programId,
      sourceBlacklist,
      destBlacklist,
    } as any);
  }

  async initializeTransferHookExtraAccounts(authority: PublicKey) {
    if (!this.sdk.transferHookProgram) {
      throw new Error("Transfer Hook Program not provided to SDK");
    }

    if (!this.sdk.mintAddress) throw new Error("Mint not set");
    const mint = this.sdk.mintAddress;
    const extraAccountMetaList = SolanaStablecoin.getExtraAccountMetaListPDA(
      mint,
      this.sdk.transferHookProgram.programId,
    );

    return this.sdk.transferHookProgram.methods
      .initializeExtraAccountMetaList()
      .accounts({
        payer: authority,
        extraAccountMetaList,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any);
  }
}

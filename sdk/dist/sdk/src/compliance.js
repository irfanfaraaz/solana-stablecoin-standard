"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSSComplianceModule = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const core_1 = require("./core");
const spl_token_1 = require("@solana/spl-token");
class SSSComplianceModule {
    constructor(sdk) {
        this.sdk = sdk;
    }
    /**
     * Add an account to the blacklist. Optionally pass a reason for audit/logging (not stored on-chain).
     */
    async addToBlacklist(authority, accountToBlacklist, reason) {
        if (!this.sdk.mintAddress)
            throw new Error("Mint not set");
        const mint = this.sdk.mintAddress;
        const config = core_1.SolanaStablecoin.getConfigPDA(mint, this.sdk.program.programId);
        const roleAccount = core_1.SolanaStablecoin.getRoleAccountPDA(mint, this.sdk.program.programId);
        const blacklistEntry = core_1.SolanaStablecoin.getBlacklistEntryPDA(mint, accountToBlacklist, this.sdk.program.programId);
        return this.sdk.program.methods.addToBlacklist().accounts({
            blacklister: authority,
            config,
            roles: roleAccount,
            targetAccount: accountToBlacklist,
            blacklistEntry,
            mint,
            systemProgram: web3_js_1.SystemProgram.programId,
        });
    }
    async removeFromBlacklist(authority, accountToUnblacklist) {
        if (!this.sdk.mintAddress)
            throw new Error("Mint not set");
        const mint = this.sdk.mintAddress;
        const config = core_1.SolanaStablecoin.getConfigPDA(mint, this.sdk.program.programId);
        const roleAccount = core_1.SolanaStablecoin.getRoleAccountPDA(mint, this.sdk.program.programId);
        const blacklistEntry = core_1.SolanaStablecoin.getBlacklistEntryPDA(mint, accountToUnblacklist, this.sdk.program.programId);
        return this.sdk.program.methods.removeFromBlacklist().accounts({
            blacklister: authority,
            config,
            roles: roleAccount,
            targetAccount: accountToUnblacklist,
            blacklistEntry,
            mint,
        });
    }
    async seize(authority, from, to, amount) {
        if (!this.sdk.mintAddress)
            throw new Error("Mint not set");
        const mint = this.sdk.mintAddress;
        const config = core_1.SolanaStablecoin.getConfigPDA(mint, this.sdk.program.programId);
        const roleAccount = core_1.SolanaStablecoin.getRoleAccountPDA(mint, this.sdk.program.programId);
        const sourceBlacklist = core_1.SolanaStablecoin.getBlacklistEntryPDA(mint, from, this.sdk.program.programId);
        const destBlacklist = core_1.SolanaStablecoin.getBlacklistEntryPDA(mint, to, this.sdk.program.programId);
        const sourceAta = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, from, true, spl_token_1.TOKEN_2022_PROGRAM_ID);
        const destinationAta = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, to, true, spl_token_1.TOKEN_2022_PROGRAM_ID);
        const extraMetaList = core_1.SolanaStablecoin.getExtraAccountMetaListPDA(mint, this.sdk.transferHookProgram.programId);
        return this.sdk.program.methods.seize(new anchor_1.BN(amount)).accounts({
            seizer: authority,
            fromAccount: sourceAta,
            toAccount: destinationAta,
            mint,
            config,
            roles: roleAccount,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
            transferHookProgram: this.sdk.transferHookProgram.programId,
            extraMetaList,
            stablecoinProgram: this.sdk.program.programId,
            sourceBlacklist,
            destBlacklist,
        });
    }
    async initializeTransferHookExtraAccounts(authority) {
        if (!this.sdk.transferHookProgram) {
            throw new Error("Transfer Hook Program not provided to SDK");
        }
        if (!this.sdk.mintAddress)
            throw new Error("Mint not set");
        const mint = this.sdk.mintAddress;
        const extraAccountMetaList = core_1.SolanaStablecoin.getExtraAccountMetaListPDA(mint, this.sdk.transferHookProgram.programId);
        return this.sdk.transferHookProgram.methods
            .initializeExtraAccountMetaList()
            .accounts({
            payer: authority,
            extraAccountMetaList,
            mint,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        });
    }
}
exports.SSSComplianceModule = SSSComplianceModule;

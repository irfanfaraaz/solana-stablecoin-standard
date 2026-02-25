"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaStablecoin = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
class SolanaStablecoin {
    constructor(program, mintAddress, transferHookProgram) {
        this.program = program;
        this.mintAddress = mintAddress;
        this.transferHookProgram = transferHookProgram;
    }
    // PDA getters
    static getMintPDA(symbol, programId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("mint"), Buffer.from(symbol)], programId)[0];
    }
    static getConfigPDA(mint, programId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config"), mint.toBuffer()], programId)[0];
    }
    static getRoleAccountPDA(mint, programId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("roles"), mint.toBuffer()], programId)[0];
    }
    static getMinterPDA(mint, minter, programId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("minter"), mint.toBuffer(), minter.toBuffer()], programId)[0];
    }
    static getBlacklistEntryPDA(mint, account, programId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("blacklist"), mint.toBuffer(), account.toBuffer()], programId)[0];
    }
    static getExtraAccountMetaListPDA(mint, transferHookProgramId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("extra-account-metas"), mint.toBuffer()], transferHookProgramId)[0];
    }
    // Core operations
    async initialize(authority, config, transferHookProgramId) {
        const mint = SolanaStablecoin.getMintPDA(config.symbol, this.program.programId);
        this.mintAddress = mint;
        const configPda = SolanaStablecoin.getConfigPDA(mint, this.program.programId);
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        const builder = this.program.methods
            .initialize(config.name, config.symbol, config.uri, config.decimals, config.enablePermanentDelegate, config.enableTransferHook, config.defaultAccountFrozen ?? false, false, // enableConfidentialTransfers
        transferHookProgramId || null)
            .accounts({
            admin: authority,
            config: configPda,
            roleAccount,
            mint,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        });
        return builder;
    }
    async mint(authority, to, amount) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        const minterAccount = SolanaStablecoin.getMinterPDA(mint, authority, this.program.programId);
        const destinationAtas = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, to, true, spl_token_1.TOKEN_2022_PROGRAM_ID);
        return this.program.methods.mint(new anchor_1.BN(amount)).accounts({
            minter: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            minterConfig: minterAccount,
            mint,
            toAccount: destinationAtas,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        });
    }
    async burn(authority, from, amount) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        const sourceAta = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, from, true, spl_token_1.TOKEN_2022_PROGRAM_ID);
        return this.program.methods.burn(new anchor_1.BN(amount)).accounts({
            burner: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            roles: roleAccount,
            mint,
            fromAccount: sourceAta,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        });
    }
    async freezeAccount(authority, accountToFreeze) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        const ataToFreeze = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, accountToFreeze, true, spl_token_1.TOKEN_2022_PROGRAM_ID);
        return this.program.methods.freezeAccount().accounts({
            blacklister: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            roles: roleAccount,
            mint,
            tokenAccount: ataToFreeze,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        });
    }
    async thawAccount(authority, accountToThaw) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        const ataToThaw = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, accountToThaw, true, spl_token_1.TOKEN_2022_PROGRAM_ID);
        return this.program.methods.thawAccount().accounts({
            blacklister: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            roles: roleAccount,
            mint,
            tokenAccount: ataToThaw,
            tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
        });
    }
    async pause(authority) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        return this.program.methods.pause().accounts({
            pauser: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            roles: roleAccount,
            mint,
        });
    }
    async unpause(authority) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        return this.program.methods.unpause().accounts({
            pauser: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            roles: roleAccount,
            mint,
        });
    }
    async updateMinter(authority, minter, isActive, dailyLimit) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const minterAccount = SolanaStablecoin.getMinterPDA(mint, minter, this.program.programId);
        return this.program.methods
            .configureMinter(isActive, new anchor_1.BN(dailyLimit))
            .accounts({
            admin: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            minter,
            minterConfig: minterAccount,
            mint,
            systemProgram: web3_js_1.SystemProgram.programId,
        });
    }
    async updateRoles(authority, roles) {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const mint = this.mintAddress;
        const roleAccount = SolanaStablecoin.getRoleAccountPDA(mint, this.program.programId);
        return this.program.methods
            .updateRoles(roles.burner || null, roles.pauser || null, roles.blacklister || null, roles.seizer || null)
            .accounts({
            admin: authority,
            config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
            roles: roleAccount,
            mint,
        });
    }
    // --- View methods (req: getTotalSupply, getConfig, getRoles) ---
    /** Returns total supply of the stablecoin mint. Requires mintAddress to be set. */
    async getTotalSupply() {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const info = await this.program.provider.connection.getTokenSupply(this.mintAddress);
        return BigInt(info.value.amount);
    }
    /** Fetches on-chain config (decimals, pause, flags, name, symbol, uri). */
    async getConfig() {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const configPda = SolanaStablecoin.getConfigPDA(this.mintAddress, this.program.programId);
        const raw = await this.program.account.stablecoinConfig.fetch(configPda);
        return {
            bump: raw.bump,
            masterAuthority: raw.masterAuthority,
            mint: raw.mint,
            name: raw.name ?? "",
            symbol: raw.symbol ?? "",
            uri: raw.uri ?? "",
            decimals: raw.decimals,
            isPaused: raw.isPaused,
            enablePermanentDelegate: raw.enablePermanentDelegate,
            enableTransferHook: raw.enableTransferHook,
            defaultAccountFrozen: raw.defaultAccountFrozen ?? false,
            enableConfidentialTransfers: raw.enableConfidentialTransfers,
        };
    }
    /** Fetches on-chain role account (burner, pauser, blacklister, seizer). */
    async getRoles() {
        if (!this.mintAddress)
            throw new Error("Mint not set");
        const rolesPda = SolanaStablecoin.getRoleAccountPDA(this.mintAddress, this.program.programId);
        const raw = await this.program.account.roleAccount.fetch(rolesPda);
        return {
            bump: raw.bump,
            burner: raw.burner,
            pauser: raw.pauser,
            blacklister: raw.blacklister,
            seizer: raw.seizer,
        };
    }
    /**
     * Create a new stablecoin: initialize mint + config, and for SSS-2 init transfer-hook extra accounts.
     * Caller must run .rpc() on the returned init builder (and optionally on hook init).
     */
    static async create(program, authority, config, transferHookProgram) {
        const instance = new SolanaStablecoin(program, undefined, transferHookProgram);
        const initBuilder = await instance.initialize(authority, config, transferHookProgram?.programId);
        await initBuilder.rpc();
        instance.mintAddress = SolanaStablecoin.getMintPDA(config.symbol, program.programId);
        if (config.enableTransferHook &&
            transferHookProgram &&
            instance.mintAddress) {
            const compliance = new (await Promise.resolve().then(() => __importStar(require("./compliance")))).SSSComplianceModule(instance);
            const hookInit = await compliance.initializeTransferHookExtraAccounts(authority);
            await hookInit.rpc();
        }
        return instance;
    }
    /**
     * Load an existing stablecoin by mint address (no init). Use for existing mints.
     */
    static load(program, mintAddress, transferHookProgram) {
        return new SolanaStablecoin(program, mintAddress, transferHookProgram);
    }
}
exports.SolanaStablecoin = SolanaStablecoin;

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  Signer,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl, BN } from "@coral-xyz/anchor";
import { SSS_1_PRESET, SSS_2_PRESET, SSS_3_PRESET } from "./presets";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import type { Stablecoin } from "../../target/types/stablecoin";
import type { TransferHook } from "../../target/types/transfer_hook";
import { SSS3ConfidentialModule } from "./confidential";

/** Config for creating a new stablecoin (name, symbol, etc.). Stored on-chain in StablecoinConfig. */
export interface StablecoinConfig {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  /** Policy flag: new accounts start frozen when true. Stored on-chain only. */
  defaultAccountFrozen?: boolean;
  /** SSS-3: enable Token-2022 confidential transfer mint extension. */
  enableConfidentialTransfers?: boolean;
  /** SSS-3: restrict transfers to allowlisted wallets when enabled. */
  enableAllowlist?: boolean;
}

/** On-chain config account (decimals, pause, flags, name, symbol, uri). */
export interface StablecoinConfigAccount {
  bump: number;
  masterAuthority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  isPaused: boolean;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
  enableConfidentialTransfers: boolean;
  enableAllowlist: boolean;
}

/** On-chain role account (burner, pauser, blacklister, seizer). */
export interface RoleAccountData {
  bump: number;
  burner: PublicKey;
  pauser: PublicKey;
  blacklister: PublicKey;
  seizer: PublicKey;
}

const DEFAULT_STABLECOIN_PROGRAM_ID =
  "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM";
const DEFAULT_TRANSFER_HOOK_PROGRAM_ID =
  "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi";

/** Options for createFromConnection: preset or full config, plus authority. */
export interface CreateFromConnectionOptions {
  authority: Keypair;
  /** Preset name; when set, name/symbol/decimals (and optionally uri) are required. */
  preset?: "sss-1" | "sss-2" | "sss-3";
  name: string;
  symbol: string;
  uri?: string;
  decimals: number;
  /** Full config; used when preset is not set. */
  config?: StablecoinConfig;
  /** Override program IDs (default: built-in devnet/local IDs). */
  programIds?: { stablecoin?: string; transferHook?: string };
  /** Path to directory containing stablecoin.json and transfer_hook.json (Node only; default: cwd/target/idl). */
  idlPath?: string;
  /** Pre-loaded IDL objects (for browser or when path not available). */
  idl?: { stablecoin: Idl; transferHook?: Idl };
}

export class SolanaStablecoin {
  public program: Program<Stablecoin>;
  public mintAddress?: PublicKey;
  public transferHookProgram?: Program<TransferHook>;

  constructor(
    program: Program<Stablecoin>,
    mintAddress?: PublicKey,
    transferHookProgram?: Program<TransferHook>
  ) {
    this.program = program;
    this.mintAddress = mintAddress;
    this.transferHookProgram = transferHookProgram;
  }

  /**
   * SSS-3: Returns the confidential transfer module when mint is configured for
   * confidential transfers. Throws if mintAddress is not set.
   */
  getConfidential(): SSS3ConfidentialModule {
    if (!this.mintAddress) throw new Error("Mint not set");
    return new SSS3ConfidentialModule(this, this.mintAddress);
  }

  // PDA getters
  static getMintPDA(symbol: string, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), Buffer.from(symbol)],
      programId
    )[0];
  }

  static getConfigPDA(mint: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mint.toBuffer()],
      programId
    )[0];
  }

  static getRoleAccountPDA(mint: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("roles"), mint.toBuffer()],
      programId
    )[0];
  }

  static getMinterPDA(
    mint: PublicKey,
    minter: PublicKey,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.toBuffer(), minter.toBuffer()],
      programId
    )[0];
  }

  static getBlacklistEntryPDA(
    mint: PublicKey,
    account: PublicKey,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.toBuffer(), account.toBuffer()],
      programId
    )[0];
  }

  static getAllowlistEntryPDA(
    mint: PublicKey,
    wallet: PublicKey,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("allowlist"), mint.toBuffer(), wallet.toBuffer()],
      programId
    )[0];
  }

  static getExtraAccountMetaListPDA(
    mint: PublicKey,
    transferHookProgramId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint.toBuffer()],
      transferHookProgramId
    )[0];
  }

  // Core operations

  async initialize(
    authority: PublicKey,
    config: StablecoinConfig,
    transferHookProgramId?: PublicKey
  ) {
    const mint = SolanaStablecoin.getMintPDA(
      config.symbol,
      this.program.programId
    );
    this.mintAddress = mint;
    const configPda = SolanaStablecoin.getConfigPDA(
      mint,
      this.program.programId
    );
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );

    const builder = this.program.methods
      .initialize(
        config.name,
        config.symbol,
        config.uri,
        config.decimals,
        config.enablePermanentDelegate,
        config.enableTransferHook,
        config.defaultAccountFrozen ?? false,
        config.enableConfidentialTransfers ?? false,
        config.enableAllowlist ?? false,
        transferHookProgramId || null
      )
      .accounts({
        admin: authority,
        config: configPda,
        roleAccount,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any);

    return builder;
  }

  async mint(
    authority: PublicKey,
    to: PublicKey,
    amount: number | string // Will be converted to BN
  ) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );
    const minterAccount = SolanaStablecoin.getMinterPDA(
      mint,
      authority,
      this.program.programId
    );
    const destinationAtas = getAssociatedTokenAddressSync(
      mint,
      to,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    return this.program.methods.mint(new BN(amount)).accounts({
      minter: authority,
      config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
      minterConfig: minterAccount,
      mint,
      toAccount: destinationAtas,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    } as any);
  }

  /**
   * Build mint instructions including createAssociatedTokenAccountInstruction if the
   * recipient's Token-2022 ATA does not exist. Fetches ATA info via RPC.
   * Use for mints when recipient may not have an ATA yet.
   */
  static async buildMintInstructions(
    connection: Connection,
    sdk: SolanaStablecoin,
    authority: PublicKey,
    to: PublicKey,
    amount: number | string,
    feePayer: PublicKey
  ): Promise<import("@solana/web3.js").TransactionInstruction[]> {
    if (!sdk.mintAddress) throw new Error("Mint not set");
    const mint = sdk.mintAddress;
    const ata = getAssociatedTokenAddressSync(
      mint,
      to,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const instructions: import("@solana/web3.js").TransactionInstruction[] = [];
    try {
      const ataInfo = await connection.getAccountInfo(ata);
      if (!ataInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            feePayer,
            ata,
            to,
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
    } catch {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          feePayer,
          ata,
          to,
          mint,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }
    const mintBuilder = await sdk.mint(authority, to, amount);
    const mintIx = await (mintBuilder as any).instruction();
    instructions.push(mintIx);
    return instructions;
  }

  async burn(
    authority: PublicKey,
    from: PublicKey,
    amount: number | string // Will be converted to BN
  ) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );
    const sourceAta = getAssociatedTokenAddressSync(
      mint,
      from,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    return this.program.methods.burn(new BN(amount)).accounts({
      burner: authority,
      config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
      roles: roleAccount,
      mint,
      fromAccount: sourceAta,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    } as any);
  }

  async freezeAccount(authority: PublicKey, accountToFreeze: PublicKey) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );
    const ataToFreeze = getAssociatedTokenAddressSync(
      mint,
      accountToFreeze,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    return this.program.methods.freezeAccount().accounts({
      blacklister: authority,
      config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
      roles: roleAccount,
      mint,
      tokenAccount: ataToFreeze,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    } as any);
  }

  async thawAccount(authority: PublicKey, accountToThaw: PublicKey) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );
    const ataToThaw = getAssociatedTokenAddressSync(
      mint,
      accountToThaw,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    return this.program.methods.thawAccount().accounts({
      blacklister: authority,
      config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
      roles: roleAccount,
      mint,
      tokenAccount: ataToThaw,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    } as any);
  }

  /** SSS-3: Add a wallet to the allowlist (master authority only). */
  async addToAllowlist(authority: PublicKey, wallet: PublicKey) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const config = SolanaStablecoin.getConfigPDA(mint, this.program.programId);
    const allowlistEntry = SolanaStablecoin.getAllowlistEntryPDA(
      mint,
      wallet,
      this.program.programId
    );

    return this.program.methods.addToAllowlist().accounts({
      authority,
      config,
      mint,
      wallet,
      allowlistEntry,
      systemProgram: SystemProgram.programId,
    } as any);
  }

  /** SSS-3: Remove a wallet from the allowlist (master authority only). */
  async removeFromAllowlist(authority: PublicKey, wallet: PublicKey) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const config = SolanaStablecoin.getConfigPDA(mint, this.program.programId);
    const allowlistEntry = SolanaStablecoin.getAllowlistEntryPDA(
      mint,
      wallet,
      this.program.programId
    );

    return this.program.methods.removeFromAllowlist().accounts({
      authority,
      config,
      mint,
      wallet,
      allowlistEntry,
      systemProgram: SystemProgram.programId,
    } as any);
  }

  async pause(authority: PublicKey) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );

    return this.program.methods.pause().accounts({
      pauser: authority,
      config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
      roles: roleAccount,
      mint,
    } as any);
  }

  async unpause(authority: PublicKey) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );

    return this.program.methods.unpause().accounts({
      pauser: authority,
      config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
      roles: roleAccount,
      mint,
    } as any);
  }

  async updateMinter(
    authority: PublicKey,
    minter: PublicKey,
    isActive: boolean,
    dailyLimit: number | string
  ) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const minterAccount = SolanaStablecoin.getMinterPDA(
      mint,
      minter,
      this.program.programId
    );

    return this.program.methods
      .configureMinter(isActive, new BN(dailyLimit))
      .accounts({
        admin: authority,
        config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
        minter,
        minterConfig: minterAccount,
        mint,
        systemProgram: SystemProgram.programId,
      } as any);
  }

  async updateRoles(
    authority: PublicKey,
    roles: {
      burner?: PublicKey | null;
      pauser?: PublicKey | null;
      blacklister?: PublicKey | null;
      seizer?: PublicKey | null;
    }
  ) {
    if (!this.mintAddress) throw new Error("Mint not set");
    const mint = this.mintAddress;
    const roleAccount = SolanaStablecoin.getRoleAccountPDA(
      mint,
      this.program.programId
    );

    return this.program.methods
      .updateRoles(
        roles.burner || null,
        roles.pauser || null,
        roles.blacklister || null,
        roles.seizer || null
      )
      .accounts({
        admin: authority,
        config: SolanaStablecoin.getConfigPDA(mint, this.program.programId),
        roles: roleAccount,
        mint,
      } as any);
  }

  // --- View methods (req: getTotalSupply, getConfig, getRoles) ---

  /** Returns total supply of the stablecoin mint. Requires mintAddress to be set. */
  async getTotalSupply(): Promise<bigint> {
    if (!this.mintAddress) throw new Error("Mint not set");
    const info = await this.program.provider.connection.getTokenSupply(
      this.mintAddress
    );
    return BigInt(info.value.amount);
  }

  /** Fetches on-chain config (decimals, pause, flags, name, symbol, uri). */
  async getConfig(): Promise<StablecoinConfigAccount> {
    if (!this.mintAddress) throw new Error("Mint not set");
    const configPda = SolanaStablecoin.getConfigPDA(
      this.mintAddress,
      this.program.programId
    );
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
      enableAllowlist: raw.enableAllowlist ?? false,
    };
  }

  /** Fetches on-chain role account (burner, pauser, blacklister, seizer). */
  async getRoles(): Promise<RoleAccountData> {
    if (!this.mintAddress) throw new Error("Mint not set");
    const rolesPda = SolanaStablecoin.getRoleAccountPDA(
      this.mintAddress,
      this.program.programId
    );
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
   * Create a new stablecoin from a Connection and options (preset or config).
   * Loads IDL from idlPath (Node) or uses provided idl; builds Program(s) and calls create().
   * In browser, pass idl.stablecoin (and idl.transferHook for SSS-2) or use create(program, ...).
   */
  static async createFromConnection(
    connection: Connection,
    options: CreateFromConnectionOptions
  ): Promise<SolanaStablecoin> {
    const programIds = options.programIds ?? {};
    const stablecoinProgramId = new PublicKey(
      programIds.stablecoin ?? DEFAULT_STABLECOIN_PROGRAM_ID
    );
    const transferHookProgramId = new PublicKey(
      programIds.transferHook ?? DEFAULT_TRANSFER_HOOK_PROGRAM_ID
    );

    let stablecoinIdl: Idl;
    let transferHookIdl: Idl | undefined;

    if (options.idl) {
      stablecoinIdl = options.idl.stablecoin;
      transferHookIdl = options.idl.transferHook;
    } else {
      const isNode =
        typeof process !== "undefined" &&
        process.versions?.node &&
        typeof require !== "undefined";
      if (!isNode) {
        throw new Error(
          "createFromConnection requires idl option in browser; or use create(program, authority, config, transferHookProgram)"
        );
      }
      const path = require("path") as typeof import("path");
      const fs = require("fs") as typeof import("fs");
      const base = options.idlPath ?? path.join(process.cwd(), "target", "idl");
      const stablecoinPath = path.join(base, "stablecoin.json");
      const transferHookPath = path.join(base, "transfer_hook.json");
      if (!fs.existsSync(stablecoinPath)) {
        throw new Error(
          `IDL not found at ${stablecoinPath}. Set idlPath or run from repo root.`
        );
      }
      stablecoinIdl = JSON.parse(
        fs.readFileSync(stablecoinPath, "utf-8")
      ) as Idl;
      if (fs.existsSync(transferHookPath)) {
        transferHookIdl = JSON.parse(
          fs.readFileSync(transferHookPath, "utf-8")
        ) as Idl;
      }
    }

    const wallet = new Wallet(options.authority);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    (stablecoinIdl as any).address = stablecoinProgramId.toBase58();
    const stablecoinProgram = new Program(
      stablecoinIdl as any,
      provider
    ) as Program<Stablecoin>;
    let transferHookProgram: Program<TransferHook> | undefined;
    if (transferHookIdl) {
      (transferHookIdl as any).address = transferHookProgramId.toBase58();
      transferHookProgram = new Program(
        transferHookIdl as any,
        provider
      ) as Program<TransferHook>;
    }

    let config: StablecoinConfig;
    if (options.config) {
      config = options.config;
    } else if (options.preset === "sss-1") {
      config = {
        name: options.name,
        symbol: options.symbol,
        uri: options.uri ?? "",
        decimals: options.decimals,
        ...SSS_1_PRESET,
      };
    } else if (options.preset === "sss-3") {
      config = {
        name: options.name,
        symbol: options.symbol,
        uri: options.uri ?? "",
        decimals: options.decimals,
        ...SSS_3_PRESET,
      };
    } else {
      config = {
        name: options.name,
        symbol: options.symbol,
        uri: options.uri ?? "",
        decimals: options.decimals,
        ...SSS_2_PRESET,
      };
    }

    return SolanaStablecoin.create(
      stablecoinProgram,
      options.authority.publicKey,
      config,
      transferHookProgram
    );
  }

  /**
   * Create a new stablecoin: initialize mint + config, and for SSS-2 init transfer-hook extra accounts.
   * Caller must run .rpc() on the returned init builder (and optionally on hook init).
   */
  static async create(
    program: Program<Stablecoin>,
    authority: PublicKey,
    config: StablecoinConfig,
    transferHookProgram?: Program<TransferHook>
  ): Promise<SolanaStablecoin> {
    const instance = new SolanaStablecoin(
      program,
      undefined,
      transferHookProgram
    );
    const initBuilder = await instance.initialize(
      authority,
      config,
      transferHookProgram?.programId
    );
    await initBuilder.rpc();
    instance.mintAddress = SolanaStablecoin.getMintPDA(
      config.symbol,
      program.programId
    );
    if (
      config.enableTransferHook &&
      transferHookProgram &&
      instance.mintAddress
    ) {
      const compliance = new (await import("./compliance")).SSSComplianceModule(
        instance
      );
      const hookInit = await compliance.initializeTransferHookExtraAccounts(
        authority,
        config.enableAllowlist ?? false
      );
      await hookInit.rpc();
    }
    return instance;
  }

  /**
   * Load an existing stablecoin by mint address (no init). Use for existing mints.
   */
  static load(
    program: Program<Stablecoin>,
    mintAddress: PublicKey,
    transferHookProgram?: Program<TransferHook>
  ): SolanaStablecoin {
    return new SolanaStablecoin(program, mintAddress, transferHookProgram);
  }
}

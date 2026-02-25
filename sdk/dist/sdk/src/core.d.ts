import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import type { Stablecoin } from "../../target/types/stablecoin";
import type { TransferHook } from "../../target/types/transfer_hook";
/** Config for creating a new stablecoin (name, symbol, etc.). Not stored on-chain except via metadata. */
export interface StablecoinConfig {
    name: string;
    symbol: string;
    uri: string;
    decimals: number;
    enablePermanentDelegate: boolean;
    enableTransferHook: boolean;
}
/** On-chain config account (decimals, pause, flags). Name/symbol/uri are not on-chain in current program. */
export interface StablecoinConfigAccount {
    bump: number;
    masterAuthority: PublicKey;
    mint: PublicKey;
    decimals: number;
    isPaused: boolean;
    enablePermanentDelegate: boolean;
    enableTransferHook: boolean;
    enableConfidentialTransfers: boolean;
}
/** On-chain role account (burner, pauser, blacklister, seizer). */
export interface RoleAccountData {
    bump: number;
    burner: PublicKey;
    pauser: PublicKey;
    blacklister: PublicKey;
    seizer: PublicKey;
}
export declare class SolanaStablecoin {
    program: Program<Stablecoin>;
    mintAddress?: PublicKey;
    transferHookProgram?: Program<TransferHook>;
    constructor(program: Program<Stablecoin>, mintAddress?: PublicKey, transferHookProgram?: Program<TransferHook>);
    static getMintPDA(symbol: string, programId: PublicKey): PublicKey;
    static getConfigPDA(mint: PublicKey, programId: PublicKey): PublicKey;
    static getRoleAccountPDA(mint: PublicKey, programId: PublicKey): PublicKey;
    static getMinterPDA(mint: PublicKey, minter: PublicKey, programId: PublicKey): PublicKey;
    static getBlacklistEntryPDA(mint: PublicKey, account: PublicKey, programId: PublicKey): PublicKey;
    static getExtraAccountMetaListPDA(mint: PublicKey, transferHookProgramId: PublicKey): PublicKey;
    initialize(authority: PublicKey, config: StablecoinConfig, transferHookProgramId?: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "initialize";
        discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
        accounts: [{
            "name": "admin";
            "writable": true;
            "signer": true;
        }, {
            "name": "config";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roleAccount";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [109, 105, 110, 116];
                }, {
                    "kind": "arg";
                    "path": "symbol";
                }];
            };
        }, {
            "name": "tokenProgram";
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }, {
            "name": "systemProgram";
            "address": "11111111111111111111111111111111";
        }];
        args: [{
            "name": "name";
            "type": "string";
        }, {
            "name": "symbol";
            "type": "string";
        }, {
            "name": "uri";
            "type": "string";
        }, {
            "name": "decimals";
            "type": "u8";
        }, {
            "name": "enablePermanentDelegate";
            "type": "bool";
        }, {
            "name": "enableTransferHook";
            "type": "bool";
        }, {
            "name": "enableConfidentialTransfers";
            "type": "bool";
        }, {
            "name": "transferHookProgramId";
            "type": {
                "option": "pubkey";
            };
        }];
    } & {
        name: "initialize";
    }, {
        name: "admin";
        writable: true;
        signer: true;
    } | {
        name: "config";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roleAccount";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [109, 105, 110, 116];
            }, {
                "kind": "arg";
                "path": "symbol";
            }];
        };
    } | {
        name: "tokenProgram";
        address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
    } | {
        name: "systemProgram";
        address: "11111111111111111111111111111111";
    }>>;
    mint(authority: PublicKey, to: PublicKey, amount: number | string): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "mint";
        discriminator: [51, 57, 225, 47, 182, 146, 137, 166];
        accounts: [{
            "name": "minter";
            "writable": true;
            "signer": true;
        }, {
            "name": "config";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "minterConfig";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [109, 105, 110, 116, 101, 114];
                }, {
                    "kind": "account";
                    "path": "mint";
                }, {
                    "kind": "account";
                    "path": "minter";
                }];
            };
        }, {
            "name": "mint";
            "writable": true;
        }, {
            "name": "toAccount";
            "writable": true;
        }, {
            "name": "tokenProgram";
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }];
        args: [{
            "name": "amount";
            "type": "u64";
        }];
    } & {
        name: "mint";
    }, {
        name: "minter";
        writable: true;
        signer: true;
    } | {
        name: "config";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "minterConfig";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [109, 105, 110, 116, 101, 114];
            }, {
                "kind": "account";
                "path": "mint";
            }, {
                "kind": "account";
                "path": "minter";
            }];
        };
    } | {
        name: "mint";
        writable: true;
    } | {
        name: "toAccount";
        writable: true;
    } | {
        name: "tokenProgram";
        address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
    }>>;
    burn(authority: PublicKey, from: PublicKey, amount: number | string): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "burn";
        discriminator: [116, 110, 29, 56, 107, 219, 42, 93];
        accounts: [{
            "name": "burner";
            "writable": true;
            "signer": true;
        }, {
            "name": "config";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roles";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
            "writable": true;
        }, {
            "name": "fromAccount";
            "writable": true;
        }, {
            "name": "tokenProgram";
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }];
        args: [{
            "name": "amount";
            "type": "u64";
        }];
    } & {
        name: "burn";
    }, {
        name: "burner";
        writable: true;
        signer: true;
    } | {
        name: "config";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roles";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
        writable: true;
    } | {
        name: "fromAccount";
        writable: true;
    } | {
        name: "tokenProgram";
        address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
    }>>;
    freezeAccount(authority: PublicKey, accountToFreeze: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "freezeAccount";
        discriminator: [253, 75, 82, 133, 167, 238, 43, 130];
        accounts: [{
            "name": "blacklister";
            "signer": true;
        }, {
            "name": "config";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roles";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
            "writable": true;
        }, {
            "name": "tokenAccount";
            "writable": true;
        }, {
            "name": "tokenProgram";
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }];
        args: [];
    } & {
        name: "freezeAccount";
    }, {
        name: "blacklister";
        signer: true;
    } | {
        name: "config";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roles";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
        writable: true;
    } | {
        name: "tokenAccount";
        writable: true;
    } | {
        name: "tokenProgram";
        address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
    }>>;
    thawAccount(authority: PublicKey, accountToThaw: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "thawAccount";
        discriminator: [115, 152, 79, 213, 213, 169, 184, 35];
        accounts: [{
            "name": "blacklister";
            "signer": true;
        }, {
            "name": "config";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roles";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
            "writable": true;
        }, {
            "name": "tokenAccount";
            "writable": true;
        }, {
            "name": "tokenProgram";
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }];
        args: [];
    } & {
        name: "thawAccount";
    }, {
        name: "blacklister";
        signer: true;
    } | {
        name: "config";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roles";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
        writable: true;
    } | {
        name: "tokenAccount";
        writable: true;
    } | {
        name: "tokenProgram";
        address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
    }>>;
    pause(authority: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "pause";
        discriminator: [211, 22, 221, 251, 74, 121, 193, 47];
        accounts: [{
            "name": "pauser";
            "signer": true;
        }, {
            "name": "config";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roles";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
        }];
        args: [];
    } & {
        name: "pause";
    }, {
        name: "pauser";
        signer: true;
    } | {
        name: "config";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roles";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
    }>>;
    unpause(authority: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "unpause";
        discriminator: [169, 144, 4, 38, 10, 141, 188, 255];
        accounts: [{
            "name": "pauser";
            "signer": true;
        }, {
            "name": "config";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roles";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
        }];
        args: [];
    } & {
        name: "unpause";
    }, {
        name: "pauser";
        signer: true;
    } | {
        name: "config";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roles";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
    }>>;
    updateMinter(authority: PublicKey, minter: PublicKey, isActive: boolean, dailyLimit: number | string): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "configureMinter";
        discriminator: [182, 155, 212, 100, 11, 175, 51, 242];
        accounts: [{
            "name": "admin";
            "writable": true;
            "signer": true;
        }, {
            "name": "config";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "minter";
        }, {
            "name": "minterConfig";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [109, 105, 110, 116, 101, 114];
                }, {
                    "kind": "account";
                    "path": "mint";
                }, {
                    "kind": "account";
                    "path": "minter";
                }];
            };
        }, {
            "name": "systemProgram";
            "address": "11111111111111111111111111111111";
        }, {
            "name": "mint";
        }];
        args: [{
            "name": "isActive";
            "type": "bool";
        }, {
            "name": "dailyMintQuota";
            "type": "u64";
        }];
    } & {
        name: "configureMinter";
    }, {
        name: "admin";
        writable: true;
        signer: true;
    } | {
        name: "config";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "minter";
    } | {
        name: "minterConfig";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [109, 105, 110, 116, 101, 114];
            }, {
                "kind": "account";
                "path": "mint";
            }, {
                "kind": "account";
                "path": "minter";
            }];
        };
    } | {
        name: "systemProgram";
        address: "11111111111111111111111111111111";
    } | {
        name: "mint";
    }>>;
    updateRoles(authority: PublicKey, roles: {
        burner?: PublicKey | null;
        pauser?: PublicKey | null;
        blacklister?: PublicKey | null;
        seizer?: PublicKey | null;
    }): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<Stablecoin, {
        name: "updateRoles";
        discriminator: [220, 152, 205, 233, 177, 123, 219, 125];
        accounts: [{
            "name": "admin";
            "signer": true;
        }, {
            "name": "config";
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [99, 111, 110, 102, 105, 103];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "roles";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [114, 111, 108, 101, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
        }];
        args: [{
            "name": "burner";
            "type": {
                "option": "pubkey";
            };
        }, {
            "name": "pauser";
            "type": {
                "option": "pubkey";
            };
        }, {
            "name": "blacklister";
            "type": {
                "option": "pubkey";
            };
        }, {
            "name": "seizer";
            "type": {
                "option": "pubkey";
            };
        }];
    } & {
        name: "updateRoles";
    }, {
        name: "admin";
        signer: true;
    } | {
        name: "config";
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [99, 111, 110, 102, 105, 103];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "roles";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [114, 111, 108, 101, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
    }>>;
    /** Returns total supply of the stablecoin mint. Requires mintAddress to be set. */
    getTotalSupply(): Promise<bigint>;
    /** Fetches on-chain config (decimals, pause, flags). Name/symbol/uri are not stored on-chain. */
    getConfig(): Promise<StablecoinConfigAccount>;
    /** Fetches on-chain role account (burner, pauser, blacklister, seizer). */
    getRoles(): Promise<RoleAccountData>;
    /**
     * Create a new stablecoin: initialize mint + config, and for SSS-2 init transfer-hook extra accounts.
     * Caller must run .rpc() on the returned init builder (and optionally on hook init).
     */
    static create(program: Program<Stablecoin>, authority: PublicKey, config: StablecoinConfig, transferHookProgram?: Program<TransferHook>): Promise<SolanaStablecoin>;
    /**
     * Load an existing stablecoin by mint address (no init). Use for existing mints.
     */
    static load(program: Program<Stablecoin>, mintAddress: PublicKey, transferHookProgram?: Program<TransferHook>): SolanaStablecoin;
}

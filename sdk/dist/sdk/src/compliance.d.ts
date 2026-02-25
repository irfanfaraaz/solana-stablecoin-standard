import { PublicKey } from "@solana/web3.js";
import { SolanaStablecoin } from "./core";
export declare class SSSComplianceModule {
    private sdk;
    constructor(sdk: SolanaStablecoin);
    addToBlacklist(authority: PublicKey, accountToBlacklist: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<import("../../target/types/stablecoin").Stablecoin, {
        name: "addToBlacklist";
        discriminator: [90, 115, 98, 231, 173, 119, 117, 176];
        accounts: [{
            "name": "blacklister";
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
            "name": "targetAccount";
        }, {
            "name": "blacklistEntry";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [98, 108, 97, 99, 107, 108, 105, 115, 116];
                }, {
                    "kind": "account";
                    "path": "mint";
                }, {
                    "kind": "account";
                    "path": "targetAccount";
                }];
            };
        }, {
            "name": "systemProgram";
            "address": "11111111111111111111111111111111";
        }, {
            "name": "mint";
        }];
        args: [];
    } & {
        name: "addToBlacklist";
    }, {
        name: "blacklister";
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
        name: "targetAccount";
    } | {
        name: "blacklistEntry";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [98, 108, 97, 99, 107, 108, 105, 115, 116];
            }, {
                "kind": "account";
                "path": "mint";
            }, {
                "kind": "account";
                "path": "targetAccount";
            }];
        };
    } | {
        name: "systemProgram";
        address: "11111111111111111111111111111111";
    } | {
        name: "mint";
    }>>;
    removeFromBlacklist(authority: PublicKey, accountToUnblacklist: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<import("../../target/types/stablecoin").Stablecoin, {
        name: "removeFromBlacklist";
        discriminator: [47, 105, 20, 10, 165, 168, 203, 219];
        accounts: [{
            "name": "blacklister";
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
            "name": "targetAccount";
        }, {
            "name": "blacklistEntry";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [98, 108, 97, 99, 107, 108, 105, 115, 116];
                }, {
                    "kind": "account";
                    "path": "mint";
                }, {
                    "kind": "account";
                    "path": "targetAccount";
                }];
            };
        }, {
            "name": "systemProgram";
            "address": "11111111111111111111111111111111";
        }, {
            "name": "mint";
        }];
        args: [];
    } & {
        name: "removeFromBlacklist";
    }, {
        name: "blacklister";
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
        name: "targetAccount";
    } | {
        name: "blacklistEntry";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [98, 108, 97, 99, 107, 108, 105, 115, 116];
            }, {
                "kind": "account";
                "path": "mint";
            }, {
                "kind": "account";
                "path": "targetAccount";
            }];
        };
    } | {
        name: "systemProgram";
        address: "11111111111111111111111111111111";
    } | {
        name: "mint";
    }>>;
    seize(authority: PublicKey, from: PublicKey, to: PublicKey, amount: number | string): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<import("../../target/types/stablecoin").Stablecoin, {
        name: "seize";
        discriminator: [129, 159, 143, 31, 161, 224, 241, 84];
        accounts: [{
            "name": "seizer";
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
            "name": "toAccount";
            "writable": true;
        }, {
            "name": "tokenProgram";
            "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }, {
            "name": "transferHookProgram";
        }, {
            "name": "extraMetaList";
        }, {
            "name": "stablecoinProgram";
        }, {
            "name": "sourceBlacklist";
        }, {
            "name": "destBlacklist";
        }];
        args: [{
            "name": "amount";
            "type": "u64";
        }];
    } & {
        name: "seize";
    }, {
        name: "seizer";
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
        name: "toAccount";
        writable: true;
    } | {
        name: "tokenProgram";
        address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
    } | {
        name: "transferHookProgram";
    } | {
        name: "extraMetaList";
    } | {
        name: "stablecoinProgram";
    } | {
        name: "sourceBlacklist";
    } | {
        name: "destBlacklist";
    }>>;
    initializeTransferHookExtraAccounts(authority: PublicKey): Promise<import("@coral-xyz/anchor/dist/cjs/program/namespace/methods").MethodsBuilder<import("../../target/types/transfer_hook").TransferHook, {
        name: "initializeExtraAccountMetaList";
        discriminator: [92, 197, 174, 197, 41, 124, 19, 3];
        accounts: [{
            "name": "payer";
            "writable": true;
            "signer": true;
        }, {
            "name": "extraAccountMetaList";
            "writable": true;
            "pda": {
                "seeds": [{
                    "kind": "const";
                    "value": [101, 120, 116, 114, 97, 45, 97, 99, 99, 111, 117, 110, 116, 45, 109, 101, 116, 97, 115];
                }, {
                    "kind": "account";
                    "path": "mint";
                }];
            };
        }, {
            "name": "mint";
        }, {
            "name": "systemProgram";
            "address": "11111111111111111111111111111111";
        }];
        args: [];
    } & {
        name: "initializeExtraAccountMetaList";
    }, {
        name: "payer";
        writable: true;
        signer: true;
    } | {
        name: "extraAccountMetaList";
        writable: true;
        pda: {
            "seeds": [{
                "kind": "const";
                "value": [101, 120, 116, 114, 97, 45, 97, 99, 99, 111, 117, 110, 116, 45, 109, 101, 116, 97, 115];
            }, {
                "kind": "account";
                "path": "mint";
            }];
        };
    } | {
        name: "mint";
    } | {
        name: "systemProgram";
        address: "11111111111111111111111111111111";
    }>>;
}

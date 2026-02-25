# SSS-3 — Private stablecoin (POC)

SSS-3 is an **experimental** profile: SSS-2 plus **confidential transfers** (Token-2022) and **allowlists** so only approved wallets can send/receive. Documented as a proof-of-concept; tooling (e.g. zk proofs for confidential transfers) is still maturing.

## Scope

- Everything in **SSS-2** (permanent delegate, transfer hook, blacklist, seize, freeze, thaw).
- **Confidential transfer mint:** Mint is created with the Token-2022 `ConfidentialTransferMint` extension; authority is the stablecoin config PDA; `auto_approve_new_accounts` is true; no auditor key in this POC.
- **Allowlist:** When `enable_allowlist` is true, only wallets with an `AllowlistEntry` (PDA) and `is_allowed == true` may be source or destination of a transfer. Master authority can add/remove entries.

## Extensions

| Extension | Enabled |
|-----------|---------|
| All SSS-2 | Yes |
| ConfidentialTransferMint | Yes (POC) |
| Transfer hook + allowlist | Yes (when enable_allowlist) |

## On-chain

- **Stablecoin program:** `initialize(..., enable_confidential_transfers, enable_allowlist, ...)`. Allowlist: `add_to_allowlist`, `remove_from_allowlist` (master authority only). PDAs: `AllowlistEntry` seeds `["allowlist", mint, wallet]`.
- **Transfer hook:** `initialize_extra_account_meta_list(enable_allowlist)`. When `enable_allowlist` is true, extra accounts include config PDA + source/dest allowlist PDAs; execute checks both blacklist and allowlist.

## Preset

SDK preset: `SSS_3_PRESET` → `{ enablePermanentDelegate: true, enableTransferHook: true, enableConfidentialTransfers: true, enableAllowlist: true }`.

Init with:

```bash
yarn cli init --preset sss-3 -n "Private Coin" -s PCOIN -u "https://..." -d 6
```

Allowlist (master authority only):

```bash
yarn cli allowlist add <wallet_pubkey> -m <mint>
yarn cli allowlist remove <wallet_pubkey> -m <mint>
```

## SDK

- `createFromConnection(connection, { preset: "sss-3", ... })`
- `sdk.addToAllowlist(authority, wallet)` / `sdk.removeFromAllowlist(authority, wallet)`
- `SolanaStablecoin.getAllowlistEntryPDA(mint, wallet, programId)`

## POC caveats

- **Confidential transfers:** Mint has the extension; full confidential flows (configure account, deposit, withdraw, transfer with proofs) require client-side zk tooling and are not exercised in this repo.
- **Allowlist:** Fully enforced by the transfer hook when enabled; add source/dest to allowlist before they can transfer.

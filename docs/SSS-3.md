# SSS-3 — Allowlist-gated confidential stablecoin

SSS-3 is an **experimental** profile: SSS-2 plus **confidential transfers** (Token-2022) and **allowlists**. Only allowlisted wallets can send or receive; only allowlisted wallets can fund confidential balances. This gives **privacy for approved parties** (e.g. KYC’d users), not open confidential transfers.

## Scope

- Everything in **SSS-2** (permanent delegate, transfer hook, blacklist, seize, freeze, thaw).
- **Confidential transfer mint:** Mint is created with the Token-2022 `ConfidentialTransferMint` extension; authority is the stablecoin config PDA; `auto_approve_new_accounts` is true; no auditor key.
- **Allowlist:** When `enable_allowlist` is true, only wallets with an `AllowlistEntry` (PDA) and `is_allowed == true` may be source or destination of a transfer. **Before depositing into confidential**, the SDK checks the allowlist and rejects if the owner is not allowed.

## Extensions

| Extension | Enabled |
|-----------|---------|
| All SSS-2 | Yes |
| ConfidentialTransferMint | Yes |
| Transfer hook + allowlist | Yes (when enable_allowlist) |

## On-chain

- **Stablecoin program:** `initialize(..., enable_confidential_transfers, enable_allowlist, ...)`. Allowlist: `add_to_allowlist`, `remove_from_allowlist` (master authority only). PDAs: `AllowlistEntry` seeds `["allowlist", mint, wallet]`.
- **Transfer hook:** `initialize_extra_account_meta_list(enable_allowlist)`. When `enable_allowlist` is true, extra accounts include config PDA + source/dest allowlist PDAs; execute checks both blacklist and allowlist. The same hook is invoked for confidential transfers (SPL uses the same account layout).

## Confidential flow (SDK)

The SDK exposes the full confidential flow via `sdk.getConfidential()` when the mint is set:

| Operation | Method | Notes |
|-----------|--------|--------|
| Configure account | `configureConfidentialAccount(owner, instructionData, tokenAccount?, extraAccounts?)` | One-time setup; caller supplies instruction data (and proof/context accounts) from their proof flow. |
| Fund confidential | `fundConfidential(owner, amount, decimals, tokenAccount?)` | **Allowlist check:** if mint has allowlist, throws unless owner is on allowlist. Builds SPL deposit instruction. |
| Apply pending | `applyPending(owner, instructionData, tokenAccount?)` | Caller supplies instruction data from decryption/proof flow. |
| Confidential transfer | `confidentialTransfer(sourceOwner, destOwner, instructionData, extraAccounts?)` | Caller supplies instruction data (encrypted amount + proof) and optional proof context accounts. |
| Withdraw | `withdrawConfidential(owner, instructionData, extraAccounts?, tokenAccount?)` | Caller supplies instruction data and optional proof context accounts. |

**Proofs:** Configure, apply pending, confidential transfer, and withdraw require ZK proof data (or proof context accounts). This repo does **not** implement proof generation. The SDK only builds the Token-2022 instructions; the integrator supplies instruction data and optional proof context accounts from a compatible proof service or client-side tooling (e.g. pubkey validity for configure; decryption/proof for apply pending; equality, ciphertext validity, range proofs for transfer and withdraw). Proofs can be included in the same transaction or pre-verified into context state accounts and passed as `extraAccounts`. See [Solana confidential transfer](https://solana.com/docs/tokens/extensions/confidential-transfer), [SPL quickstart](https://spl.solana.com/confidential-token/quickstart), [Confidential Balances sample](https://github.com/solana-developers/Confidential-Balances-Sample).

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

- `createFromConnection(connection, { preset: "sss-3", ... })` / `SolanaStablecoin.load(program, mintAddress, transferHookProgram)`
- `sdk.addToAllowlist(authority, wallet)` / `sdk.removeFromAllowlist(authority, wallet)`
- `SolanaStablecoin.getAllowlistEntryPDA(mint, wallet, programId)`
- **Confidential:** `sdk.getConfidential()` → `SSS3ConfidentialModule` with `configureConfidentialAccount`, `fundConfidential`, `applyPending`, `confidentialTransfer`, `withdrawConfidential`

## Allowlist

Fully enforced by the transfer hook when enabled; add source/dest to allowlist before they can transfer. **Deposit into confidential** is also gated: `fundConfidential` checks the allowlist and throws if the owner is not allowed when the mint has allowlist enabled.

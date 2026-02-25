# SDK — TypeScript usage

The SDK (`@stbr/sss-token`) provides a typed client for the stablecoin and transfer-hook programs.

## Installation

From the repo (after `anchor build` and SDK build):

```ts
import {
  SolanaStablecoin,
  SSSComplianceModule,
  SSS_1_PRESET,
  SSS_2_PRESET,
  type StablecoinConfig,
} from "@stbr/sss-token";
```

Use the workspace package or `file:../sdk` in your app.

## Presets and custom config

**Presets** (no name/symbol/uri/decimals; you supply those):

- `SSS_1_PRESET`: `{ enablePermanentDelegate: false, enableTransferHook: false }`
- `SSS_2_PRESET`: `{ enablePermanentDelegate: true, enableTransferHook: true }`

**Full config** (for init):

```ts
const config: StablecoinConfig = {
  name: "My Coin",
  symbol: "MCOIN",
  uri: "https://example.com/mcoin",
  decimals: 6,
  ...SSS_2_PRESET,
};
```

## Create and load

**Create** (initialize a new stablecoin; for SSS-2 also inits transfer-hook extra-account-metas):

```ts
const sdk = await SolanaStablecoin.create(
  program,           // Anchor Program<Stablecoin>
  authority,         // PublicKey
  config,
  transferHookProgram // optional Program<TransferHook>
);
// sdk.mintAddress is set
```

**Load** (bind to existing mint):

```ts
const sdk = SolanaStablecoin.load(
  program,
  mintAddress,
  transferHookProgram
);
```

## Operations

Assume `sdk` is a `SolanaStablecoin` with `mintAddress` set.

- **Mint:** `sdk.mint(authority, recipient, amount)` → returns instruction builder (e.g. `.rpc()`).
- **Burn:** `sdk.burn(authority, from, amount)`.
- **Freeze / Thaw:** `sdk.freeze(pauser, accountToFreeze)`, `sdk.thaw(pauser, accountToThaw)`.
- **Pause / Unpause:** `sdk.pause(pauser)`, `sdk.unpause(pauser)`.
- **Update minter:** `sdk.updateMinter(authority, minterPubkey, active, dailyQuota)`.

## View methods

- `sdk.getTotalSupply()` → `BN` (total supply).
- `sdk.getConfig()` → `StablecoinConfigAccount` (decimals, isPaused, flags, masterAuthority, mint, etc.).
- `sdk.getRoles()` → `RoleAccountData` (burner, pauser, blacklister, seizer).

## Compliance (SSS-2)

```ts
const compliance = new SSSComplianceModule(sdk);
// After init, run once to set extra-account-metas for the mint:
await compliance.initializeTransferHookExtraAccounts(authority).then(tx => tx.rpc());
// Then:
compliance.addToBlacklist(blacklister, address);
compliance.removeFromBlacklist(blacklister, address);
compliance.seize(seizer, fromAccount, treasury, amount);
```

## PDA helpers

- `SolanaStablecoin.getMintPDA(symbol, programId)`
- `SolanaStablecoin.getConfigPDA(mint, programId)`

Use these to compute addresses before or without loading the full SDK instance.

# Solana Stablecoin Standard (SSS)

Reference implementation of the Solana Stablecoin Standard: a configurable Token-2022 stablecoin with optional compliance (freeze, blacklist, seize) and two presets — **SSS-1** (minimal) and **SSS-2** (compliant).

## Overview

- **Base program** (`stablecoin`): Initialize mint, config, roles; mint/burn, freeze/thaw, pause/unpause; minter management; optional blacklist and seize (SSS-2).
- **Transfer hook program** (`transfer_hook`): Validates transfers against blacklist when compliance is enabled.
- **TypeScript SDK** (`@stbr/sss-token`): Create/load stablecoins, operations, presets, compliance module.
- **Admin CLI** (`sss-token`): Init, mint, burn, freeze, thaw, pause, blacklist, seize, status, supply, minters.

## Quick start

**Prerequisites:** Node.js, Yarn, Anchor, Solana CLI. Build programs and SDK from repo root:

```bash
anchor build
cd sdk && yarn build
cd ../cli && yarn install && yarn build
```

**Initialize (SSS-1, no compliance):**

```bash
yarn cli init --preset sss-1 -n "My Coin" -s MCOIN -u "https://example.com/mcoin" -d 6
# Output: mint, configPda, signature
```

**Initialize (SSS-2, with transfer hook + blacklist):**

```bash
yarn cli init --preset sss-2 -n "Compliant Coin" -s CCOIN -u "https://example.com/ccoin" -d 6
```

**Mint, status, supply:**

```bash
yarn cli mint <RECIPIENT_PUBKEY> 1000 -m <MINT_ADDRESS>
yarn cli status -m <MINT_ADDRESS>
yarn cli supply -m <MINT_ADDRESS>
```

Use `--rpc-url`, `--keypair`, and `--json` as needed. Run from repo root so `target/idl/*.json` and (optional) `Anchor.toml` resolve.

## Program IDs (localnet)

| Program        | Localnet (default) |
|----------------|-------------------|
| stablecoin     | `3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM` |
| transfer_hook  | `4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi` |

For Devnet deployment and example tx links, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Preset comparison

| Feature              | SSS-1 | SSS-2 |
|----------------------|-------|-------|
| Token-2022 mint      | ✅    | ✅    |
| Freeze / thaw        | ✅    | ✅    |
| Pause / unpause      | ✅    | ✅    |
| Permanent delegate   | ❌    | ✅    |
| Transfer hook        | ❌    | ✅    |
| Blacklist / seize    | ❌    | ✅    |

See [SSS-1.md](docs/SSS-1.md) and [SSS-2.md](docs/SSS-2.md) for specs.

## Architecture (high level)

```
┌─────────────────────────────────────────────────────────────┐
│  CLI (sss-token) / Backend / Frontend                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│  TypeScript SDK (@stbr/sss-token)                            │
│  SolanaStablecoin, SSSComplianceModule, Presets              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│  Stablecoin program (config, roles, mint, burn, freeze, …)    │
│  + Transfer hook program (blacklist check on transfer)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    Token-2022 / SPL
```

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Layer model, PDAs, security.
- [SDK.md](docs/SDK.md) — SDK usage and examples.
- [OPERATIONS.md](docs/OPERATIONS.md) — Operator runbook and CLI reference.
- [COMPLIANCE.md](docs/COMPLIANCE.md) — Regulatory and audit considerations.
- [API.md](docs/API.md) — Backend API reference.
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Devnet deployment and proof (Program IDs + example tx links).
- [SECURITY.md](docs/SECURITY.md) — Access control, error codes, mitigations.
- [TESTING.md](docs/TESTING.md) — How to run tests and filter by preset.

## Tests

```bash
anchor test
```

Runs integration tests (SSS-1 and SSS-2 flows) and unit-style error cases. Requires a local validator.

Filter by preset: `anchor test -- --grep "SSS-1: integration"` or `--grep "Unit: instruction"`. See [TESTING.md](docs/TESTING.md).

## Project structure

```
solana-stablecoin-standard/
├── programs/
│   ├── stablecoin/          # Configurable stablecoin (SSS-1 + SSS-2)
│   └── transfer_hook/       # Blacklist check on transfer (SSS-2)
├── sdk/                     # @stbr/sss-token (presets, core, compliance)
├── cli/                     # sss-token admin CLI
├── backend/                 # Mint/burn + compliance REST API
├── tests/
│   ├── context.ts           # Shared test context (provider, programs, keypairs)
│   ├── stablecoin.test.ts   # Test runner (registers all suites)
│   └── suites/              # Per-area describe blocks (sss2-vanilla, sss1-integration, sss3-allowlist, unit-*, sdk-unit)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SDK.md
│   ├── OPERATIONS.md
│   ├── SSS-1.md, SSS-2.md
│   ├── COMPLIANCE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── TESTING.md
├── docker-compose.yml       # Backend service + healthcheck
└── Anchor.toml
```

## License

MIT.

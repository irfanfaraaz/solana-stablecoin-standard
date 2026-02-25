# Testing — SSS

## Run all tests

From repo root:

```bash
anchor test
```

Starts a local validator, deploys the stablecoin and transfer_hook programs, then runs the TypeScript test suite. Expect ~1 minute; 25 tests (SSS-1 integration, SSS-2 flow, preset config, unit error/success cases, SDK unit tests).

## Test layout

Tests live in **`tests/stablecoin.test.ts`**:

| Describe block | What it covers |
|----------------|----------------|
| **SSS-1: Vanilla Stablecoin Operations** | SSS-2 preset: init, transfer-hook init, mint, transfer with hook, blacklist add, blocked transfer, seize, thaw, pause/unpause |
| **SSS-1: integration (mint → transfer → freeze → thaw)** | SSS-1 preset: init (no hook), mint, plain SPL transfer, freeze, thaw |
| **Preset config tests** | SSS-1/SSS-2 config flags (enableTransferHook, enablePermanentDelegate) via getConfig() |
| **Unit: instruction error cases** | ComplianceNotEnabled, Unauthorized (burn), QuotaExceeded, MinterInactive |
| **Unit: instruction success cases** | update_roles, configure_minter, transfer_authority, remove_from_blacklist |
| **SDK unit tests** | getTotalSupply, getConfig, getRoles, SolanaStablecoin.load |

## Trident fuzz

**`trident-tests/`** contains a Trident fuzz target for the stablecoin program (simulation-only: state tracked in Rust, invariants on supply and pause). Run from repo root:

```bash
cargo run -p trident-tests --bin fuzz_0
```

Or with Trident CLI: `cargo install trident-cli`, then `cd trident-tests && trident fuzz run fuzz_0 --timeout 300`. See **`trident-tests/README.md`** and [Trident docs](https://ackee.xyz/trident/docs/latest/).

## Filter by preset (Mocha grep)

```bash
# SSS-1 integration only
anchor test -- --grep "SSS-1: integration"

# SSS-2 flow (first describe)
anchor test -- --grep "SSS-1: Vanilla"

# Error cases only
anchor test -- --grep "Unit: instruction"
```

## Prerequisites

- Anchor CLI, Solana CLI, Node/yarn.
- `anchor build` must have been run so `target/idl/*.json` and program binaries exist.

## Backend / Docker

Backend has no separate test suite. Health check is exercised via `docker compose up` (GET /health). See [API.md](API.md) and `backend/README.md`.

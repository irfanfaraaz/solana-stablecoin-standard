# Testing — SSS

## Run all tests

From repo root:

```bash
anchor test
```

Starts a local validator, deploys the stablecoin and transfer_hook programs, then runs the TypeScript test suite. Expect ~1 minute; 15 tests (SSS-1 integration, SSS-2 flow, unit-style error cases).

## Test layout

Tests live in **`tests/stablecoin.test.ts`**:

| Describe block | What it covers |
|----------------|----------------|
| **SSS-1: Vanilla Stablecoin Operations** | SSS-2 preset: init, transfer-hook init, mint, transfer with hook, blacklist add, blocked transfer, seize, thaw, pause/unpause |
| **SSS-1: integration (mint → transfer → freeze → thaw)** | SSS-1 preset: init (no hook), mint, plain SPL transfer, freeze, thaw |
| **Unit: instruction error cases** | `add_to_blacklist` on SSS-1 → ComplianceNotEnabled; burn with non-burner → Unauthorized; mint over quota → QuotaExceeded; inactive minter → MinterInactive |

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

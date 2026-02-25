# Trident fuzz tests

Fuzz tests for the **stablecoin** program using [Trident](https://ackee.xyz/trident/docs/latest/) (manually guided fuzzing for Solana/Anchor).

## Layout

- **`Trident.toml`** — config: stablecoin program ID and `../target/deploy/stablecoin.so`
- **`fuzz_0/`** — one fuzz target:
  - **`test_fuzz.rs`** — flows and invariants (simulation-only)
  - **`fuzz_accounts.rs`** — account address storage for future on-chain fuzz
  - **`types.rs`** — stub; regenerate with `trident fuzz refresh fuzz_0` after `anchor build`

## Simulation-only (current)

Like in SVS, the current target does **not** call the deployed program. It tracks state in Rust and asserts invariants:

- **Flows:** `flow_initialize`, `flow_mint`, `flow_burn`, `flow_pause`, `flow_unpause`
- **Invariants:** total supply never overflows; burns only when supply > 0; pause blocks mint/burn

Run:

```bash
# From repo root (workspace)
cargo run -p trident-tests --bin fuzz_0

# Or from this directory
cargo run --bin fuzz_0
```

For a timed run with the Trident CLI (if installed):

```bash
cargo install trident-cli
cd trident-tests
trident fuzz run fuzz_0 --timeout 300
```

## Regenerating types

After changing the stablecoin program:

```bash
anchor build
cd trident-tests
trident fuzz refresh fuzz_0
```

This overwrites `fuzz_0/types.rs` with instruction/account types from the built `.so`. The current stub compiles without running this.

## Requirements

- Rust, Solana CLI, Anchor
- Optional: `cargo install trident-cli` for `trident fuzz run` / `trident fuzz refresh`

Integration and unit tests (TypeScript) are in `tests/stablecoin.test.ts`; run with `anchor test`.

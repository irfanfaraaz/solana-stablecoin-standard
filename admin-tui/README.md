# SSS Admin TUI

Interactive terminal UI for Solana Stablecoin Standard admin operations. Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Prerequisites

- From **repo root**: `anchor build` so `target/idl/stablecoin.json` and `target/idl/transfer_hook.json` exist.
- Keypair at `KEYPAIR_PATH` (default `~/.config/solana/id.json`).

## Run

From repo root:

```bash
yarn tui
```

On first run (or when no mint is saved): you’ll be asked to **paste the mint address (base58)**. Enter to confirm; leave empty + Enter to skip. You can then choose to **save it for next time** (y/n); it’s stored in `admin-tui/.mint`. You can change or set the mint anytime from the main menu: **Set / change mint**.

Optional env: `SSS_MINT_ADDRESS` still overrides and skips the prompt if set.

Or from this directory:

```bash
yarn build && yarn start
# Or with tsx (no build): yarn dev
```

## Screens

- **Main menu**: Status, Mint, Burn, Freeze, Thaw, Pause, Unpause, Blacklist (SSS-2), Allowlist (SSS-3), Seize (SSS-2).
- **Status**: Config, supply, pause state, roles (burner, pauser, blacklister, seizer).
- **Mint / Burn / Freeze / Thaw / Blacklist / Allowlist / Seize**: Step-by-step prompts; transaction status and signature shown after submit.

**Keys:** Arrow keys + Enter to select; type in text inputs and press Enter to submit; **q** or **Esc** to go back to main menu.

## Tests

```bash
yarn test
```

Runs Vitest for `App` and `TransactionStatus` (ink-testing-library).

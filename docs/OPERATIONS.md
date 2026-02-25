# Operations — Operator runbook and CLI reference

Run the CLI from the **repo root** with `yarn cli` (or `node cli/dist/index.js`). Ensure `target/idl/*.json` exists (`anchor build`).

## Global options

| Option | Description | Default |
|--------|-------------|---------|
| `-k, --keypair <path>` | Keypair for signer | `~/.config/solana/id.json` |
| `--rpc-url <url>` | RPC endpoint | `http://127.0.0.1:8899` |
| `--json` | Output JSON | — |

## Init

**Preset (SSS-1 or SSS-2):**

```bash
yarn cli init --preset sss-1 -n "My Coin" -s MCOIN -u "https://example.com/mcoin" -d 6
yarn cli init --preset sss-2 -n "Compliant" -s CCOIN -u "https://example.com/ccoin" -d 6
```

**Custom config (TOML file):**

```bash
yarn cli init --custom path/to/config.toml
```

TOML keys: `name`, `symbol`, `uri`, `decimals`, `enable_permanent_delegate`, `enable_transfer_hook`, `default_account_frozen`.

Output: `mint`, `configPda`, `signature`; for SSS-2 also `transferHookInitSignature`.

## Operations (require `-m, --mint <address>`)

| Command | Description | Example |
|---------|-------------|---------|
| `mint <recipient> <amount>` | Mint to recipient | `yarn cli mint <PUBKEY> 1000 -m <MINT>` |
| `burn <amount>` | Burn from keypair ATA | `yarn cli burn 100 -m <MINT>` |
| `burn <amount> --from <address>` | Burn from another ATA | `yarn cli burn 50 -m <MINT> --from <ATA>` |
| `freeze <address>` | Freeze token account | `yarn cli freeze <ATA> -m <MINT>` |
| `thaw <address>` | Thaw token account | `yarn cli thaw <ATA> -m <MINT>` |
| `pause` | Pause all operations | `yarn cli pause -m <MINT>` |
| `unpause` | Unpause | `yarn cli unpause -m <MINT>` |
| `status` | Config, supply, roles | `yarn cli status -m <MINT>` |
| `supply` | Total supply only | `yarn cli supply -m <MINT>` |

## SSS-2 compliance

| Command | Description | Example |
|---------|-------------|---------|
| `blacklist add <address>` | Add to blacklist | `yarn cli blacklist add <PUBKEY> -m <MINT> -r "reason"` |
| `blacklist remove <address>` | Remove from blacklist | `yarn cli blacklist remove <PUBKEY> -m <MINT>` |
| `seize <from> -t <treasury>` | Seize to treasury | `yarn cli seize <FROM_ATA> -m <MINT> -t <TREASURY> [-a amount]` |

## Management

| Command | Description | Example |
|---------|-------------|---------|
| `minters list` | List minters (info) | `yarn cli minters -m <MINT> list` |
| `minters add <pubkey>` | Add minter | `yarn cli minters -m <MINT> add <PUBKEY> [-q quota]` |
| `minters remove <pubkey>` | Deactivate minter | `yarn cli minters -m <MINT> remove <PUBKEY>` |
| `holders` | Stub (use RPC/getTokenLargestAccounts) | — |
| `audit-log` | Stub (requires indexer) | — |

## Runbook summary

1. **Init:** Choose preset or custom; run `init`; record mint and configPda.
2. **Mint:** Use a keypair that is an authorized minter (or add one via `minters add`).
3. **Freeze / Thaw:** Use pauser keypair; specify token account address.
4. **Pause:** Use pauser; blocks mint/burn/freeze/thaw until unpause.
5. **Blacklist (SSS-2):** Use blacklister; add/remove addresses; transfers involving those addresses will fail.
6. **Seize (SSS-2):** Use seizer; specify source account and treasury; optional amount (default full balance).

All commands support `--json` for scripting.

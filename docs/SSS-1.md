# SSS-1 — Minimal stablecoin spec

SSS-1 is the **minimal** Solana Stablecoin Standard profile: a Token-2022 stablecoin with freeze/thaw and pause, **without** permanent delegate or transfer hook.

## Scope

- **Token:** Token-2022 mint with **freeze** extension.
- **No** permanent delegate.
- **No** transfer hook (plain SPL transfers; no on-transfer blacklist check).
- **Operations:** Initialize, mint, burn, freeze, thaw, pause, unpause, minter management, role updates.

## Extensions

| Extension | Enabled |
|-----------|---------|
| Freeze | Yes |
| Permanent delegate | No |
| Transfer hook | No |

## Use cases

- Stablecoins that need **freeze** (e.g. court order) and **pause** (emergency stop) but do not require transfer-time compliance (blacklist/seize).
- Simpler deployment and no separate transfer-hook program.

## Preset

SDK preset: `SSS_1_PRESET` → `{ enablePermanentDelegate: false, enableTransferHook: false }`.

Init with:

```bash
yarn cli init --preset sss-1 -n "Name" -s SYMBOL -u "https://..." -d 6
```

## Integration test

The test suite includes an SSS-1 flow: init (SSS-1) → mint → plain SPL transfer (no hook) → freeze → thaw. Run with `anchor test`.

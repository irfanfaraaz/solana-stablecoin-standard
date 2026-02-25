# SSS-2 — Compliant stablecoin spec

SSS-2 is the **compliant** Solana Stablecoin Standard profile: SSS-1 plus **permanent delegate**, **transfer hook**, and **blacklist/seize** for regulatory alignment (e.g. GENIUS Act–style controls).

## Scope

- Everything in **SSS-1** (freeze, thaw, pause, mint, burn, roles).
- **Permanent delegate:** Enables a designated authority to transfer or burn on behalf of accounts (e.g. for seize).
- **Transfer hook:** Every transfer invokes the hook program; hook checks sender and recipient against a **blacklist**; if either is blacklisted, transfer fails.
- **Blacklist / Seize:** Add/remove addresses from blacklist; seize tokens from an account to a treasury (e.g. sanctioned holder).

## Extensions

| Extension | Enabled |
|-----------|---------|
| Freeze | Yes |
| Permanent delegate | Yes |
| Transfer hook | Yes (custom program) |

## GENIUS Act alignment

- **Freeze:** Ability to freeze accounts (e.g. court order).
- **Seize:** Ability to move tokens from a designated account to a treasury (e.g. sanctioned funds).
- **Blacklist:** Block transfers to/from listed addresses.
- **Audit trail:** Backend/indexer can log blacklist and seize events (see COMPLIANCE.md).

## Preset

SDK preset: `SSS_2_PRESET` → `{ enablePermanentDelegate: true, enableTransferHook: true }`.

Init with:

```bash
yarn cli init --preset sss-2 -n "Compliant Coin" -s CCOIN -u "https://..." -d 6
```

After init, the transfer-hook **extra-account-metas** must be initialized (CLI does this automatically for SSS-2); then blacklist and seize are available.

## Integration test

The test suite includes an SSS-2 flow: init (SSS-2) → mint → transfer → add to blacklist → transfer (expect fail) → seize. Run with `anchor test`.

# Security — SSS

## Access control

- **Roles** (single roles PDA per mint): Master authority, minter (with per-minter daily quota), burner, pauser, blacklister (SSS-2), seizer (SSS-2). No single key has all powers.
- **Feature gating:** Compliance instructions (`add_to_blacklist`, `remove_from_blacklist`, `seize`) return **ComplianceNotEnabled** if the mint was initialized without `enable_transfer_hook`. Seize also requires **PermanentDelegateNotEnabled** check when permanent delegate is off.
- **Pause:** When `config.is_paused` is true, mint, burn, freeze, thaw and other mutating instructions are blocked ( **ProgramPaused** ).

## Attack surface & mitigations

| Concern | Mitigation |
|--------|-------------|
| Unauthorized mint/burn | Enforced by role checks; only configured minter/burner signers succeed. |
| Quota bypass | Per-minter daily quota enforced on-chain; **QuotaExceeded** when exceeded. |
| Inactive minter | `update_minter(..., active: false)` disables minting; **MinterInactive** if used. |
| Blacklist bypass (SSS-2) | Transfer hook runs on every transfer; sender/recipient checked against blacklist PDAs; **Blacklisted** in hook on reject. |
| Authority concentration | Roles are separate pubkeys; master can rotate role assignments via `update_roles` / `transfer_authority`. |

## Audit trail

- On-chain: Config and role state are public. Blacklist state lives in transfer-hook PDAs.
- Off-chain: Backend and indexers should log blacklist add/remove and seize with timestamp, authority, and tx signature (see [COMPLIANCE.md](COMPLIANCE.md)).

## Error codes (stablecoin program)

| Code | Name | Description |
|------|------|-------------|
| 6000 | Unauthorized | Signer does not have the required role |
| 6001 | ProgramPaused | Operations are paused |
| 6002 | QuotaExceeded | Minter exceeded daily quota |
| 6003 | MinterInactive | Minter is inactive |
| 6004 | ComplianceNotEnabled | Compliance (transfer hook) not enabled for this mint |
| 6005 | PermanentDelegateNotEnabled | Permanent delegate not enabled (e.g. for seize) |
| 6006 | ConfidentialTransfersNotEnabled | Confidential transfers not enabled |
| 6007 | MathOverflow | Arithmetic overflow |

## Transfer hook program

| Code | Name | Description |
|------|------|-------------|
| 6000 | Blacklisted | Transfer rejected: sender or recipient is blacklisted |

**Audit status:** Not audited. Use at your own risk.

# Compliance — Regulatory and audit considerations

This document outlines regulatory considerations and audit-trail expectations for SSS-2 compliant deployments.

## Regulatory context

- **GENIUS Act–style controls:** Stablecoin issuers may need to support freeze, seize, and blocking of transfers to/from designated parties. SSS-2 provides on-chain primitives (freeze, blacklist, seize) that backends can drive and log.
- **OFAC / sanctions:** Full sanctions screening is **not** implemented in this repo; the blacklist is an on-chain list that operators (or a compliance service) populate. Integration with external screening services is a backend responsibility.
- **Audit trail:** Operators should log who added/removed blacklist entries, who executed seizes, and when; see below.

## What to log (audit trail)

For **blacklist** and **seize** operations, a compliance/audit service (or indexer) should record at least:

| Event | Suggested fields |
|-------|-------------------|
| Add to blacklist | Timestamp, mint, address added, reason (if provided), authority/signer |
| Remove from blacklist | Timestamp, mint, address removed, authority/signer |
| Seize | Timestamp, mint, from-account, treasury, amount, authority/signer |

Additional context (tx signature, block, RPC request id) can be stored for traceability.

## On-chain vs off-chain

- **On-chain:** Blacklist state (who is listed), config (roles, pause), and transaction history are on Solana; explorers can show them.
- **Off-chain:** Reasons for listing, internal policy, and full audit logs are typically maintained off-chain (backend/indexer + storage) and linked to tx signatures where needed.

## Backend compliance service (Phase E)

The backend can expose:

- **Blacklist management API** (e.g. add/remove with reason and audit log).
- **Seize API** (authorized seizer only; log from/treasury/amount).
- **Audit export** (e.g. CSV/JSON of blacklist and seize events with timestamps and signers).

See [API.md](API.md) for endpoint shapes when the backend is implemented.

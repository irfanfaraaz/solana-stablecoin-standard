# API — Backend service reference

This document describes the **backend API** expected for Phase E (mint/burn service, compliance, webhooks). Implementations may vary; this is a reference shape.

## Base URL and auth

- **Base URL:** Configurable (e.g. `http://localhost:3000`).
- **Auth:** API key or JWT in header (e.g. `Authorization: Bearer <token>`); exact scheme TBD per deployment.

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness/readiness; returns 200 when service and dependencies (RPC, DB) are ok. |

## Mint / burn service

| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | `/mint` | Mint tokens to a recipient | `{ "mint": "<mint_pubkey>", "recipient": "<pubkey>", "amount": "<string>" }` |
| POST | `/burn` | Burn tokens (from configured burner ATA or specified account) | `{ "mint": "<mint_pubkey>", "amount": "<string>", "from?: "<ata_pubkey>" }` |

Response: `{ "signature": "<tx_sig>" }` or error payload. Service should validate against stablecoin config (e.g. pause, minter/quota) before submitting.

## Compliance (SSS-2)

| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | `/blacklist/add` | Add address to blacklist | `{ "mint": "<mint_pubkey>", "address": "<pubkey>", "reason?: "<string>" }` |
| POST | `/blacklist/remove` | Remove address from blacklist | `{ "mint": "<mint_pubkey>", "address": "<pubkey>" }` |
| POST | `/seize` | Seize tokens to treasury | `{ "mint": "<mint_pubkey>", "from": "<ata_pubkey>", "treasury": "<pubkey>", "amount?: "<string>" }` |

All should be logged for audit (see COMPLIANCE.md).

## Indexer / events

- **Mechanism:** WebSocket or polling of program logs / account changes; store in DB (e.g. Postgres).
- **Exposed as:** Optional GET endpoints for “recent events” or “transactions for mint” (pagination). Exact paths TBD.

## Webhooks

- **Configurable endpoints** (e.g. URL + secret per event type).
- **Events:** e.g. `mint`, `burn`, `freeze`, `thaw`, `blacklist_add`, `blacklist_remove`, `seize`.
- **Payload:** At least `event`, `mint`, `signature`, `slot`; event-specific fields (recipient, amount, address, etc.).
- **Retry:** Exponential backoff and idempotency keys recommended.

## Docker

When Phase E is implemented, `docker compose up` at repo root will start:

- Mint/burn service
- Indexer (if applicable)
- Compliance service (blacklist/seize + audit log)
- Webhook dispatcher

Env (e.g. `.env`): `RPC_URL`, keypair path or vault URL, database URL, webhook URLs. See backend directory when added.

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

Response: `{ "signature": "<tx_sig>" }` or error payload. Service should validate against stablecoin config (e.g. pause, minter/quota) before submitting. Mint and burn run a **verify** step (screening) before execution; if screening fails, the API returns 403.

## Screening API

| Method | Path | Description | Body / Query |
|--------|------|-------------|--------------|
| POST | `/screen` | Check if an address is allowed for a mint (on-chain blacklist) | Body: `{ "address": "<pubkey>", "mint": "<pubkey>" }` |
| GET | `/screen` | Same as POST, with query params | `?address=<pubkey>&mint=<pubkey>` |

Response: `{ "allowed": boolean, "reason"?: string }`. Used by operators and frontends to check an address before mint/transfer.

## Compliance (SSS-2)

| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | `/blacklist/add` | Add address to blacklist | `{ "mint": "<mint_pubkey>", "address": "<pubkey>", "reason?: "<string>" }` |
| POST | `/blacklist/remove` | Remove address from blacklist | `{ "mint": "<mint_pubkey>", "address": "<pubkey>" }` |
| POST | `/seize` | Seize tokens to treasury | `{ "mint": "<mint_pubkey>", "from": "<ata_pubkey>", "treasury": "<pubkey>", "amount?: "<string>" }` |

All should be logged for audit (see COMPLIANCE.md).

| Method | Path | Description | Query |
|--------|------|-------------|-------|
| GET | `/audit/export` | Audit trail export (CSV or JSON download) | `format=csv` or `format=json` (default) |

Response: CSV with headers `time,event,mint,signature,...` or JSON array. `Content-Disposition: attachment`.

## Indexer / events

- **Mechanism:** Polling of stablecoin program account (`getSignaturesForAddress`); events stored in a JSON file under `DATA_DIR` (default: workspace root).
- **Enable:** Set `INDEXER_ENABLED=true`. Optional `INDEXER_POLL_MS` (default 8000).
- **Endpoint:**

| Method | Path | Description | Query |
|--------|------|-------------|-------|
| GET | `/events` | Recent indexed events | `mint` (optional), `limit` (default 50, max 200), `before` (signature cursor) |

Response: `{ "events": [ { "signature", "slot", "blockTime?", "mint?", "eventType?" } ] }`.

## Webhooks

- **Config:** Set `WEBHOOK_URL` for all events, or `WEBHOOK_URL_MINT`, `WEBHOOK_URL_BURN`, `WEBHOOK_URL_BLACKLIST_ADD`, `WEBHOOK_URL_BLACKLIST_REMOVE`, `WEBHOOK_URL_SEIZE` per event. Optional `WEBHOOK_SECRET` (sent as `X-Webhook-Signature` header).
- **Events:** `mint`, `burn`, `blacklist_add`, `blacklist_remove`, `seize` (dispatched after each successful API call).
- **Payload:** At least `event`, `mint`, `signature`, `slot`; event-specific fields (recipient, amount, address, etc.).
- **Retry:** 3 retries with exponential backoff (1s, 2s, 4s). Idempotency key: `X-Idempotency-Key` (signature).

## Docker

`docker compose up` at repo root starts one container with:

- Mint/burn service
- Compliance API (blacklist/seize + audit log)
- Indexer (when `INDEXER_ENABLED=true`)
- Webhook dispatcher (when `WEBHOOK_URL` or per-event URLs are set)

Env: `RPC_URL`, keypair path or vault URL, `INDEXER_ENABLED`, `INDEXER_POLL_MS`, `WEBHOOK_URL` / `WEBHOOK_URL_<EVENT>`, `WEBHOOK_SECRET`. See [backend README](../backend/README.md).

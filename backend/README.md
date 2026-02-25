# SSS Backend

REST API for mint, burn, blacklist, and seize. Used by `docker compose up` at repo root.

## Local run (no Docker)

From **repo root** (so `target/idl` and SDK resolve):

```bash
anchor build
cd sdk && yarn build
cd backend && yarn install && yarn build
WORKSPACE_ROOT=$(pwd)/.. node dist/app.js
```

Or from repo root: `cd backend && WORKSPACE_ROOT=.. yarn start` after building.

Env: `RPC_URL`, `KEYPAIR_PATH` or `KEYPAIR_JSON`, optional `MINT_ADDRESS`, `PORT` (default 3000). Indexer: `INDEXER_ENABLED=true`, `INDEXER_POLL_MS` (default 8000), `DATA_DIR` (for events file). Webhooks: `WEBHOOK_URL` or `WEBHOOK_URL_<EVENT>`, optional `WEBHOOK_SECRET`.

## Docker

From repo root:

```bash
anchor build   # so target/idl exists
docker compose up --build
```

Backend listens on port 3000. Health: `GET /health`. With `INDEXER_ENABLED=true`, the same process runs the indexer (events file + GET /events). Webhooks fire when `WEBHOOK_URL` or per-event URLs are set. `docker compose up` starts API, indexer, and webhook dispatch in one container. See [API.md](../docs/API.md) for endpoints.

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

Env: `RPC_URL`, `KEYPAIR_PATH` or `KEYPAIR_JSON`, optional `MINT_ADDRESS`, `PORT` (default 3000).

## Docker

From repo root:

```bash
anchor build   # so target/idl exists
docker compose up --build
```

Backend listens on port 3000. Health: `GET /health`. See [API.md](../docs/API.md) for endpoints.

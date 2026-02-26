# SSS Example Frontend

Simple UI using the **@stbr/sss-token** SDK for stablecoin creation and management. Built with Next.js 16 and the [Solana Foundation Next.js template](https://solana.com/developers/templates/nextjs) (`@solana/client` + `@solana/react-hooks`).

## Features

- **Wallet**: Connect via Wallet Standard (Phantom, etc.) using `@solana/react-hooks`.
- **Mint address**: Single input at top (context); paste a stablecoin mint or set `NEXT_PUBLIC_MINT_ADDRESS`.
- **Create stablecoin**: SSS-1, SSS-2, or SSS-3 (confidential + allowlist) via SDK.
- **Mint status**: Config (name, symbol, decimals, paused, confidential, allowlist) and total supply.
- **Balance**: Your token balance for the given mint (Token-2022 ATA).
- **Transfer**: Send tokens; optional screening hint when `NEXT_PUBLIC_BACKEND_URL` is set.
- **Screening**: Check if an address is allowed for the mint (backend `/screen`); only when backend URL is set.
- **Compliance**: Blacklist (add/remove), Allowlist (SSS-3, add/remove), Seize — via SDK (wallet signs).
- **Admin**: Mint/Burn via backend (when URL set); Freeze/Thaw and Pause/Unpause via SDK.
- **Audit & events**: View audit log and export CSV/JSON; list indexed events (when backend URL set).

## Prerequisites

1. Build programs and copy IDL into the frontend:

   ```bash
   # From repo root
   anchor build
   yarn copy-idl
   ```

   This copies `target/idl/stablecoin.json` and `target/idl/transfer_hook.json` to `frontend/public/idl/`.

2. Optional: set `.env.local` (see `.env.example`):

   - `NEXT_PUBLIC_RPC_URL` – RPC endpoint (default: devnet).
   - `NEXT_PUBLIC_MINT_ADDRESS` – pre-filled mint address.
   - `NEXT_PUBLIC_BACKEND_URL` – backend API base URL; when set, enables Screening, Admin (mint/burn), Audit, and Events.
   - `NEXT_PUBLIC_API_KEY` – optional; sent as `Authorization: Bearer <key>` when calling the backend.

## Commands

```bash
# From repo root
yarn frontend:dev    # Dev server (Next.js)
yarn frontend:build  # Production build (uses webpack for SDK compatibility)

# Or from frontend/
yarn dev
yarn build
yarn start
```

## Tech stack

- **Next.js 16** (App Router), **Tailwind CSS 4**
- **@solana/client** + **@solana/react-hooks** (wallet, SPL transfer)
- **@stbr/sss-token** (reads: config, total supply)
- **@coral-xyz/anchor**, **@solana/spl-token**, **@solana/web3.js** (SDK dependencies)

IDL is loaded from `/idl/stablecoin.json` and `/idl/transfer_hook.json` at runtime so the SDK can build the Anchor program in the browser.

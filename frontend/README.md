# SSS Example Frontend

Simple UI using the **@stbr/sss-token** SDK for stablecoin creation and management. Built with Next.js 16 and the [Solana Foundation Next.js template](https://solana.com/developers/templates/nextjs) (`@solana/client` + `@solana/react-hooks`).

## Features

- **Wallet**: Connect via Wallet Standard (Phantom, etc.) using `@solana/react-hooks`.
- **Mint address**: Paste a stablecoin mint (or set `NEXT_PUBLIC_MINT_ADDRESS`).
- **Mint status**: Fetches config (name, symbol, decimals, paused) and total supply via the SDK.
- **Balance**: Shows your token balance for the given mint (Token-2022 ATA).
- **Transfer**: Send tokens to another address using `useSplToken` with Token-2022.

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

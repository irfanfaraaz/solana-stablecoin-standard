# Devnet deployment proof

Submission requirement: **Devnet deployment proof (Program ID + example transactions).**

## Deploy to Devnet

1. **Configure cluster and wallet**

   In `Anchor.toml` add (or merge) a devnet section:

   ```toml
   [programs.devnet]
   stablecoin = "<STABLECOIN_PROGRAM_ID>"
   transfer_hook = "<TRANSFER_HOOK_PROGRAM_ID>"
   ```

   Or use existing program keypairs; IDs are set at first deploy.

2. **Deploy**

   ```bash
   solana config set --url devnet
   anchor deploy --provider.cluster devnet
   ```

   This deploys both `stablecoin` and `transfer_hook`. Note the printed Program IDs.

3. **Record Program IDs**

   After deploy, record:

   - **Stablecoin program:** `________________________` (from `anchor deploy` or `programs/stablecoin/Keypair`)
   - **Transfer hook program:** `________________________` (from `programs/transfer_hook/Keypair`)

   Set them in env (or in CLI/backend) when calling Devnet:

   ```bash
   export STABLECOIN_PROGRAM_ID=<id>
   export TRANSFER_HOOK_PROGRAM_ID=<id>
   export RPC_URL=https://api.devnet.solana.com
   ```

## Example operations

Run from repo root with Devnet RPC and keypair funded on Devnet.

1. **Initialize (SSS-2)**

   ```bash
   yarn cli init --preset sss-2 -n "Devnet Coin" -s DCOIN -u "https://example.com" -d 6 --rpc-url https://api.devnet.solana.com
   ```

   Record **mint** and **signature** (link: `https://explorer.solana.com/tx/<signature>?cluster=devnet`).

2. **Mint**

   ```bash
   yarn cli mint <RECIPIENT_PUBKEY> 1000 -m <MINT_ADDRESS> --rpc-url https://api.devnet.solana.com
   ```

   Record **signature**.

3. **Blacklist + transfer (fail) + seize (SSS-2)**

   ```bash
   yarn cli blacklist add <SOME_PUBKEY> -m <MINT_ADDRESS> -r "test" --rpc-url https://api.devnet.solana.com
   # Transfer to/from that address should fail
   yarn cli seize <TOKEN_ACCOUNT> -m <MINT_ADDRESS> -t <TREASURY_PUBKEY> --rpc-url https://api.devnet.solana.com
   ```

   Record **signatures**.

## Submission checklist

- [ ] Program IDs documented (in this file or README).
- [ ] At least 2–3 example transaction links (Solana Explorer Devnet), e.g.:
  - Init
  - Mint (or transfer)
  - Blacklist or seize
- [ ] README or this doc updated with the actual IDs and links before submission.

## Placeholder (replace after deploy)

| Item | Value |
|------|--------|
| Stablecoin program (Devnet) | _Deploy and paste ID_ |
| Transfer hook program (Devnet) | _Deploy and paste ID_ |
| Example: init tx | `https://explorer.solana.com/tx/<SIG>?cluster=devnet` |
| Example: mint tx | `https://explorer.solana.com/tx/<SIG>?cluster=devnet` |
| Example: seize tx | `https://explorer.solana.com/tx/<SIG>?cluster=devnet` |

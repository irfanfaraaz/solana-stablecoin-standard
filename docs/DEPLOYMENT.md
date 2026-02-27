# Devnet deployment proof

Submission requirement: **Devnet deployment proof (Program ID + example transactions).**

## Deploy to Devnet

1. **Configure cluster and wallet**

   In `Anchor.toml` add (or merge) a devnet section:

   ```toml
[programs.devnet]
stablecoin = "<STABLECOIN_PROGRAM_ID>"
transfer_hook = "<TRANSFER_HOOK_PROGRAM_ID>"
oracle = "<ORACLE_PROGRAM_ID>"   # optional bonus: oracle integration module
   ```

   Or use existing program keypairs; IDs are set at first deploy.

2. **Deploy**

   ```bash
   solana config set --url devnet
   anchor deploy --provider.cluster devnet
   ```

This deploys both `stablecoin` and `transfer_hook`. For the oracle module, you can either include it in the same deploy (if configured in `Anchor.toml`) or deploy just the oracle with:

```bash
anchor deploy -p oracle --provider.cluster devnet
```

In all cases, note the printed Program IDs.

3. **Record Program IDs**

After deploy, record:

- **Stablecoin program:** `3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM`
- **Transfer hook program:** `4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi`
- **Oracle program (bonus):** `4xvrXEAm7HKMdgcNehGth4QvRVArJHrfhnrC4gWZfvVu`

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

- [x] Program IDs documented (in this file or README).
- [x] At least 2–3 example transaction links (Solana Explorer Devnet), e.g.:
  - Init
  - Mint (or transfer)
  - Add minter (or blacklist / seize)
- [x] README or this doc updated with the actual IDs and links before submission.

## Devnet deployment proof (filled)

| Item | Value |
|------|--------|
| Stablecoin program (Devnet) | `3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM` |
| Transfer hook program (Devnet) | `4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi` |
| Oracle program (Devnet, bonus) | `4xvrXEAm7HKMdgcNehGth4QvRVArJHrfhnrC4gWZfvVu` |
| Deploy stablecoin | [2jM7NSwhE...grUptNjF](https://explorer.solana.com/tx/2jM7NSwhEh51VWj7BA8uhPV43JHHW2AEsWQRzuB7gZDCnEh9GEoinjMPcuXoqk4qXctko8PatnxBv1Q8grUptNjF?cluster=devnet) |
| Deploy transfer_hook | [2XnnRFy1d...Y2R5CsZ](https://explorer.solana.com/tx/2XnnRFy1dVo1QWf6ZLN5Wsx44MHPUcAx9DyNVsz4N4SW1h9nvAJWAjPfmNUXuJPUsmYjHxc7ccQ3rtDSSY2R5CsZ?cluster=devnet) |
| Deploy oracle | [3yq9kShUx...TkujRTP](https://explorer.solana.com/tx/3yq9kShUxjWdeJrdwTx3VX8Ub9wh7uK7Z4PAdr8pXt6bhCabsSEEmcyJ1TGLDkZfQXgrUbpyfvobYBi9nTkujRTP?cluster=devnet) |
| Example: init tx (SSS-2 "Devnet Coin" / DCOIN) | [1p6QUvtRC...GzTRLAH](https://explorer.solana.com/tx/1p6QUvtRCjMT9ZD5R6fHqkjudvRMXYud31mFLjoXV54C27EE4oJpmivcgY9HWAcgBncKEYQdFzN2pyYpGzTRLAH?cluster=devnet) |
| Example: add minter tx | [3He7Yksm9...gM3QFPP](https://explorer.solana.com/tx/3He7Yksm9wDCwNGncWn7Ripsi6sTzmFveSFBctj5TFtPohzYKtwkNP9hLBaGzBdDfa4SQdL9rZfCn9vr5gM3QFPP?cluster=devnet) |
| Example: mint tx (1000 DCOIN) | [4cpXcSi4W...xb5CMky1](https://explorer.solana.com/tx/4cpXcSi4WuuPK9LXXpmn6b85MhKwDzJ8jBTnVtu5veHnoVkGhDiLRqAesZPEVBUFPaKMUuuapQevnveLxb5CMky1?cluster=devnet) |
| Example: blacklist add | [96mZPcNCSk8...k6Xt6](https://explorer.solana.com/tx/96mZPcNCSk8E1t7EfGBM1pq5FByeYJ57nzGmKVhmLqWyuaQVJAwic2MwzAvaQMnvtpJmwq1MP2BEaMAx69k6Xt6?cluster=devnet) |

**Mint address (example stablecoin):** `9uengGxYvYU9hRSnxHoZfFVk9nu9X2DKQoKwkrhXFqQW`

You can verify the mint on devnet: `yarn cli status -m 9uengGxYvYU9hRSnxHoZfFVk9nu9X2DKQoKwkrhXFqQW --rpc-url https://api.devnet.solana.com`. Transaction links also work on [Solscan](https://solscan.io/) (devnet): `https://solscan.io/tx/<signature>?cluster=devnet`.

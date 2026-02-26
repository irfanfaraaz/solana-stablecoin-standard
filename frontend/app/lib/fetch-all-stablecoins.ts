"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  STABLECOIN_PROGRAM_ID,
  RPC_URL,
} from "./constants";
import { fetchIdl } from "./sdk-browser";

/** Minimal config row for directory listing (mint, name, symbol, etc.). */
export type StablecoinConfigRow = {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  isPaused: boolean;
  enableAllowlist: boolean;
  enableConfidentialTransfers: boolean;
};

/** StablecoinConfig: 8 (discriminator) + bump(1) + master_authority(32) + mint(32) + name(4+64) + symbol(4+16) + uri(4+256) + decimals(1) + 7*bool(1) = 8+421 = 429. */
const STABLECOIN_CONFIG_ACCOUNT_SIZE = 429;

/**
 * Fetch all stablecoin config accounts for the stablecoin program (getProgramAccounts + decode).
 * Uses RPC_URL and STABLECOIN_PROGRAM_ID from constants.
 */
export async function fetchAllStablecoinConfigs(
  rpcUrl: string = RPC_URL,
  programIdStr: string = STABLECOIN_PROGRAM_ID
): Promise<StablecoinConfigRow[]> {
  const connection = new Connection(rpcUrl, { commitment: "confirmed" });
  const programId = new PublicKey(programIdStr);
  const { stablecoin: stablecoinIdl } = await fetchIdl();
  (stablecoinIdl as { address?: string }).address = programId.toBase58();

  const dummyWallet = {
    publicKey: new PublicKey("11111111111111111111111111111111"),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as unknown as Wallet;
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
  const program = new Program(stablecoinIdl as Idl, provider);

  // Try exact size first; then fetch all program accounts and decode (handles size drift)
  let accounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: STABLECOIN_CONFIG_ACCOUNT_SIZE }],
    commitment: "confirmed",
  });

  if (accounts.length === 0) {
    // Fallback: no size filter, decode each account (in case account size differs)
    const all = await connection.getProgramAccounts(programId, {
      commitment: "confirmed",
    });
    accounts = all.filter((a) => a.account.data.length >= 400 && a.account.data.length <= 500);
  }

  const rows: StablecoinConfigRow[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      const decoded = program.coder.accounts.decode(
        "StablecoinConfig",
        account.data
      ) as {
        mint: PublicKey;
        name: string;
        symbol: string;
        decimals: number;
        is_paused?: boolean;
        enable_allowlist?: boolean;
        enable_confidential_transfers?: boolean;
      };
      const mint = decoded.mint?.toBase58?.() ?? (decoded.mint as unknown as string);
      rows.push({
        mint: typeof mint === "string" ? mint : "",
        name: decoded.name ?? "",
        symbol: decoded.symbol ?? "",
        decimals: Number(decoded.decimals ?? 0),
        isPaused: Boolean(decoded.is_paused ?? (decoded as any).isPaused),
        enableAllowlist: Boolean(decoded.enable_allowlist ?? (decoded as any).enableAllowlist),
        enableConfidentialTransfers: Boolean(decoded.enable_confidential_transfers ?? (decoded as any).enableConfidentialTransfers),
      });
    } catch {
      // skip unreadable accounts
    }
  }
  rows.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.mint.localeCompare(b.mint));
  return rows;
}

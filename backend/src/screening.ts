/**
 * Sanctions screening: on-chain blacklist check + optional external SCREENING_URL.
 * Used by POST/GET /screen and by the verify step before mint/burn.
 */
import { PublicKey } from "@solana/web3.js";
import { SolanaStablecoin } from "@stbr/sss-token";

export interface ScreeningResult {
  allowed: boolean;
  reason?: string;
}

const SCREENING_URL = process.env.SCREENING_URL?.trim() || "";
const SCREENING_METHOD = (process.env.SCREENING_METHOD?.toUpperCase() || "POST") as "GET" | "POST";
const SCREENING_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.SCREENING_TIMEOUT_MS || "5000", 10), 1000),
  30000
);

/**
 * Check whether an address is allowed for the given mint.
 * 1) On-chain blacklist: if the address is blacklisted for this mint, returns allowed: false.
 * 2) If SCREENING_URL is set, calls the external service and merges: allowed = blacklistAllowed && externalAllowed.
 */
export async function screenAddress(
  sdk: SolanaStablecoin,
  address: PublicKey
): Promise<ScreeningResult> {
  const mint = sdk.mintAddress;
  if (!mint) return { allowed: false, reason: "Mint not set" };

  const programId = sdk.program.programId;
  const blacklistPda = SolanaStablecoin.getBlacklistEntryPDA(mint, address, programId);

  let blacklistAllowed = true;
  try {
    const entry = await sdk.program.account.blacklistEntry.fetch(blacklistPda);
    if (entry.isBlacklisted) {
      blacklistAllowed = false;
    }
  } catch {
    // Account not found => not on blacklist
  }

  if (!blacklistAllowed) {
    return { allowed: false, reason: "On blacklist" };
  }

  if (!SCREENING_URL) {
    return { allowed: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCREENING_TIMEOUT_MS);
  try {
    const params = { address: address.toBase58(), mint: mint.toBase58() };
    const url =
      SCREENING_METHOD === "GET"
        ? `${SCREENING_URL}?${new URLSearchParams(params as Record<string, string>).toString()}`
        : SCREENING_URL;
    const res = await fetch(url, {
      method: SCREENING_METHOD,
      headers: { "Content-Type": "application/json" },
      body: SCREENING_METHOD === "POST" ? JSON.stringify(params) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { allowed: false, reason: `Screening service error: ${res.status}` };
    }
    const data = (await res.json()) as { allowed?: boolean; reason?: string };
    const externalAllowed = data?.allowed !== false;
    return {
      allowed: blacklistAllowed && externalAllowed,
      reason: data?.reason,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    return { allowed: false, reason: `Screening call failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

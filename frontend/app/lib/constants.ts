/** Default stablecoin program ID (devnet/local). */
export const STABLECOIN_PROGRAM_ID =
  process.env.NEXT_PUBLIC_STABLECOIN_PROGRAM_ID ??
  "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM";

/** Default transfer hook program ID (SSS-2). */
export const TRANSFER_HOOK_PROGRAM_ID =
  process.env.NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID ??
  "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi";

/** Oracle program ID (devnet). */
export const ORACLE_PROGRAM_ID =
  process.env.NEXT_PUBLIC_ORACLE_PROGRAM_ID ??
  "4xvrXEAm7HKMdgcNehGth4QvRVArJHrfhnrC4gWZfvVu";

/** Switchboard queue (optional). Set for oracle-based mint. */
export const SWITCHBOARD_QUEUE =
  process.env.NEXT_PUBLIC_SWITCHBOARD_QUEUE ?? null;

/** Switchboard feed hash / feed ID (optional). Set for oracle-based mint. */
export const SWITCHBOARD_FEED_HASH =
  process.env.NEXT_PUBLIC_SWITCHBOARD_FEED_HASH ?? null;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

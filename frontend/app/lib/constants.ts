/** Default stablecoin program ID (devnet/local). */
export const STABLECOIN_PROGRAM_ID =
  process.env.NEXT_PUBLIC_STABLECOIN_PROGRAM_ID ??
  "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM";

/** Default transfer hook program ID (SSS-2). */
export const TRANSFER_HOOK_PROGRAM_ID =
  process.env.NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID ??
  "4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

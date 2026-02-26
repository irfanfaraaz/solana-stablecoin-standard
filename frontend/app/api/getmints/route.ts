import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const STABLECOIN_CONFIG_ACCOUNT_SIZE = 428;

/** Decode StablecoinConfig account data (Borsh) without relying on Anchor account registry. */
function decodeStablecoinConfig(
  data: Buffer | Uint8Array
): {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  isPaused: boolean;
  enableAllowlist: boolean;
  enableConfidentialTransfers: boolean;
} {
  const buf = Buffer.from(data);
  let o = 8; // skip 8-byte discriminator
  o += 1; // bump
  o += 32; // master_authority
  const mintBytes = buf.subarray(o, o + 32);
  o += 32;
  const readString = () => {
    const len = buf.readUInt32LE(o);
    o += 4;
    const s = buf.subarray(o, o + len).toString("utf8");
    o += len;
    return s;
  };
  const name = readString();
  const symbol = readString();
  readString(); // uri
  const decimals = buf.readUInt8(o);
  o += 1;
  const isPaused = buf.readUInt8(o) !== 0;
  o += 1;
  o += 1; // enable_permanent_delegate
  o += 1; // enable_transfer_hook
  o += 1; // default_account_frozen
  const enableConfidentialTransfers = buf.readUInt8(o) !== 0;
  o += 1;
  const enableAllowlist = buf.readUInt8(o) !== 0;
  const mint = new PublicKey(mintBytes).toBase58();
  return {
    mint,
    name,
    symbol,
    decimals,
    isPaused,
    enableAllowlist,
    enableConfidentialTransfers,
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
    const programIdStr =
      process.env.NEXT_PUBLIC_STABLECOIN_PROGRAM_ID ??
      "3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM";

    const connection = new Connection(rpcUrl, { commitment: "confirmed" });
    const programId = new PublicKey(programIdStr);

    let accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: STABLECOIN_CONFIG_ACCOUNT_SIZE }],
      commitment: "confirmed",
    });

    const step1Count = accounts.length;
    if (step1Count > 0) {
      console.log("[getmints] programId=%s getProgramAccounts(dataSize=%d)=%d", programIdStr, STABLECOIN_CONFIG_ACCOUNT_SIZE, step1Count);
    }

    if (accounts.length === 0) {
      const all = await connection.getProgramAccounts(programId, {
        commitment: "confirmed",
      });
      const totalProgramAccounts = all.length;
      accounts = all.filter(
        (a) => a.account.data.length >= 400 && a.account.data.length <= 500
      );
      // Always log when fallback ran so we can debug empty getmints
      console.log("[getmints] programId=%s rpc=%s", programIdStr, rpcUrl);
      console.log("[getmints] getProgramAccounts(dataSize=%d)=%d", STABLECOIN_CONFIG_ACCOUNT_SIZE, step1Count);
      console.log("[getmints] getProgramAccounts(no filter)=%d", totalProgramAccounts);
      if (totalProgramAccounts > 0) {
        const sizes = [...new Set(all.map((a) => a.account.data.length))].sort((a, b) => a - b);
        console.log("[getmints] account data sizes in program: %s", sizes.join(", "));
      }
    }

    const accountSizes = accounts.map((a) => a.account.data.length);
    const decodeErrors: string[] = [];

    const rows: Array<{
      mint: string;
      name: string;
      symbol: string;
      decimals: number;
      isPaused: boolean;
      enableAllowlist: boolean;
      enableConfidentialTransfers: boolean;
    }> = [];

    for (const { account } of accounts) {
      try {
        const decoded = decodeStablecoinConfig(account.data);
        rows.push({
          mint: decoded.mint,
          name: decoded.name,
          symbol: decoded.symbol,
          decimals: decoded.decimals,
          isPaused: decoded.isPaused,
          enableAllowlist: decoded.enableAllowlist,
          enableConfidentialTransfers: decoded.enableConfidentialTransfers,
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        decodeErrors.push(`${account.data.length}b: ${errMsg}`);
        console.log("[getmints] decode failed size=%d %s", account.data.length, errMsg);
      }
    }

    rows.sort(
      (a, b) =>
        a.symbol.localeCompare(b.symbol) || a.mint.localeCompare(b.mint)
    );

    if (debug) {
      return NextResponse.json({
        mints: rows,
        debug: {
          programId: programIdStr,
          rpcUrl,
          step1Count,
          accountsAfterFallback: accounts.length,
          accountSizes: [...new Set(accountSizes)].sort((a, b) => a - b),
          decoded: rows.length,
          decodeErrors,
        },
      });
    }

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getmints] error", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

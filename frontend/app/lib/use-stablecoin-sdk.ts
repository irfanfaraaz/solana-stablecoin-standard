"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { SolanaStablecoin } from "@stbr/sss-token";
import type { StablecoinConfigAccount, RoleAccountData } from "@stbr/sss-token";
import { createSdkContext } from "./sdk-browser";

type UseStablecoinSdkResult = {
  sdk: SolanaStablecoin | null;
  config: StablecoinConfigAccount | null;
  roles: RoleAccountData | null;
  totalSupply: bigint | null;
  /** Oracle program (when oracle IDL is present). */
  oracleProgram: Program | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

/**
 * Build SDK and fetch config + total supply when wallet and mint are set.
 * Uses IDL from /idl/ (copy target/idl/*.json to frontend/public/idl/ after anchor build).
 */
export function useStablecoinSdk(
  walletPublicKey: PublicKey | null | undefined,
  mintAddress: string | null | undefined
): UseStablecoinSdkResult {
  const [sdk, setSdk] = useState<SolanaStablecoin | null>(null);
  const [config, setConfig] = useState<StablecoinConfigAccount | null>(null);
  const [roles, setRoles] = useState<RoleAccountData | null>(null);
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
  const [oracleProgram, setOracleProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mintPubkey = useMemo(() => {
    if (!mintAddress || mintAddress.length < 32 || mintAddress.length > 44)
      return null;
    try {
      return new PublicKey(mintAddress);
    } catch {
      return null;
    }
  }, [mintAddress]);

  const walletKeyStr = walletPublicKey?.toString() ?? null;
  const load = useCallback(async () => {
    if (!walletKeyStr || !mintPubkey) {
      setSdk(null);
      setConfig(null);
      setRoles(null);
      setTotalSupply(null);
      setOracleProgram(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { SolanaStablecoin } = await import("@stbr/sss-token");
      const {
        stablecoinProgram,
        transferHookProgram,
        oracleProgram: oracleProg,
      } = await createSdkContext(new PublicKey(walletKeyStr));
      setOracleProgram(oracleProg ?? null);
      const instance = SolanaStablecoin.load(
        stablecoinProgram as any,
        mintPubkey,
        (transferHookProgram ?? undefined) as any
      );
      setSdk(instance);
      const [cfg, rolesData, supply] = await Promise.all([
        instance.getConfig(),
        instance.getRoles().catch(() => null),
        instance.getTotalSupply(),
      ]);
      setConfig(cfg);
      setRoles(rolesData);
      setTotalSupply(supply);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setSdk(null);
      setConfig(null);
      setRoles(null);
      setTotalSupply(null);
      setOracleProgram(null);
    } finally {
      setLoading(false);
    }
  }, [walletKeyStr, mintAddress]);

  useEffect(() => {
    load();
  }, [load]);

  return { sdk, config, roles, totalSupply, oracleProgram, loading, error, refresh: load };
}

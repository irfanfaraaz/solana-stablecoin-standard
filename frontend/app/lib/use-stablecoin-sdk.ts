"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import type { SolanaStablecoin } from "@stbr/sss-token";
import type { StablecoinConfigAccount } from "@stbr/sss-token";
import { createSdkContext } from "./sdk-browser";

type UseStablecoinSdkResult = {
  sdk: SolanaStablecoin | null;
  config: StablecoinConfigAccount | null;
  totalSupply: bigint | null;
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
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
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
      setTotalSupply(null);
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
      } = await createSdkContext(new PublicKey(walletKeyStr));
      const instance = SolanaStablecoin.load(
        stablecoinProgram as any,
        mintPubkey,
        (transferHookProgram ?? undefined) as any
      );
      setSdk(instance);
      const [cfg, supply] = await Promise.all([
        instance.getConfig(),
        instance.getTotalSupply(),
      ]);
      setConfig(cfg);
      setTotalSupply(supply);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setSdk(null);
      setConfig(null);
      setTotalSupply(null);
    } finally {
      setLoading(false);
    }
  }, [walletKeyStr, mintAddress]);

  useEffect(() => {
    load();
  }, [load]);

  return { sdk, config, totalSupply, loading, error, refresh: load };
}

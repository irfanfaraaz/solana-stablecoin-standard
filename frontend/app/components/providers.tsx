"use client";

import { SolanaProvider } from "@solana/react-hooks";
import type { ReactNode } from "react";

import { autoDiscover, createClient } from "@solana/client";
import { MintProvider } from "../context/mint-context";
import { SettingsProvider } from "../context/settings-context";

const rpcUrl =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com")
    : process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

const client = createClient({
  endpoint: rpcUrl,
  walletConnectors: autoDiscover(),
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider client={client}>
      <MintProvider>
        <SettingsProvider>{children as any}</SettingsProvider>
      </MintProvider>
    </SolanaProvider>
  );
}

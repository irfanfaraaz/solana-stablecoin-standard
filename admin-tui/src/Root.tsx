import React, { useEffect, useState } from "react";
import { Text } from "ink";
import { App } from "./App.js";
import { useApp } from "./context/AppContext.js";
import {
  loadKeypair,
  getConnection,
  loadPrograms,
} from "./services/loaders.js";
import { readSavedMint } from "./services/mintStorage.js";
import { SolanaStablecoin, SSSComplianceModule } from "@stbr/sss-token";
import { PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";

const keypairPath = process.env.KEYPAIR_PATH ?? "~/.config/solana/id.json";
const rpcUrl = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const mintEnv = process.env.SSS_MINT_ADDRESS;

export function Root() {
  const { setPrograms, setSdk, setCompliance, setMint, setScreen } = useApp();
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const keypair = loadKeypair(keypairPath);
        const connection = getConnection(rpcUrl);
        const wallet = new Wallet(keypair);
        const programs = loadPrograms(connection, wallet);
        if (cancelled) return;

        setPrograms(programs);

        const mintFromEnv = mintEnv ? new PublicKey(mintEnv) : null;
        const mintFromFile = readSavedMint();
        const initialMint = mintFromEnv ?? mintFromFile;

        const sdk = new SolanaStablecoin(
          programs.stablecoinProgram as any,
          initialMint ?? undefined,
          (programs.transferHookProgram as any) ?? undefined
        );
        setSdk(sdk);
        setMint(initialMint);

        if (programs.transferHookProgram) {
          setCompliance(new SSSComplianceModule(sdk));
        }
        if (!cancelled && !initialMint) {
          setScreen("set_mint");
        }
      } catch (e) {
        if (!cancelled) setBootError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootError) {
    return <Text color="red">Boot failed: {bootError}</Text>;
  }

  return <App />;
}

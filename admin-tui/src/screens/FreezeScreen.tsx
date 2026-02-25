import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";

export function FreezeScreen() {
  const { state } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [address, setAddress] = useState("");

  const handleSubmit = async (value: string) => {
    const addr = value.trim();
    if (!addr || !service || !state.programs) return;
    try {
      await runTx(
        { pendingMessage: "Freezing account…", successMessage: "Account frozen" },
        () =>
          service.freezeAccount(
            state.programs!.wallet.publicKey,
            new PublicKey(addr)
          )
      );
    } catch {
      // Error set by runTx
    }
  };

  if (!state.mintAddress) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="FREEZE" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="FREEZE" />
        <Text color="red">SDK not ready.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="FREEZE" />
      <Box marginTop={1}>
        <Text>Owner wallet (base58): </Text>
        <TextInput
          value={address}
          onChange={setAddress}
          onSubmit={handleSubmit}
          placeholder="address"
        />
      </Box>
      <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
    </Box>
  );
}

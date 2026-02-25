import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";

type Step = "from" | "amount";

export function BurnScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [amount, setAmount] = useState("");
  const [fromAddr, setFromAddr] = useState("");
  const [step, setStep] = useState<Step>("from");

  useInput((input, key) => {
    if (input === "b" || key.backspace) {
      if (step === "amount") setStep("from");
      else setScreen("main");
    }
  });

  const handleFromSubmit = (value: string) => {
    setFromAddr(value.trim());
    setStep("amount");
  };

  const handleAmountSubmit = async (value: string) => {
    const amt = value.trim();
    if (!amt || !service || !state.programs) return;
    const from = fromAddr
      ? new PublicKey(fromAddr)
      : state.programs.wallet.publicKey;
    try {
      await runTx(
        { pendingMessage: "Burning…", successMessage: "Burned successfully" },
        () => service.burn(state.programs!.wallet.publicKey, from, amt)
      );
    } catch {
      // Error set by runTx
    }
  };

  if (!state.mintAddress) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="BURN" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="BURN" />
        <Text color="red">SDK not ready.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="BURN" />
      <Text dimColor>From authority ATA by default; optional From = base58</Text>
      {step === "from" && (
        <Box marginTop={1}>
          <Text>From (optional, base58; blank + Enter = authority): </Text>
          <TextInput
            value={fromAddr}
            onChange={setFromAddr}
            onSubmit={handleFromSubmit}
            placeholder="optional"
          />
        </Box>
      )}
      {step === "amount" && (
        <Box marginTop={1}>
          <Text>Amount: </Text>
          <TextInput
            value={amount}
            onChange={setAmount}
            onSubmit={handleAmountSubmit}
            placeholder="e.g. 100"
          />
        </Box>
      )}
      <Box marginTop={1}>
        <Footer keys="q/Esc main menu · b previous step" />
      </Box>
    </Box>
  );
}

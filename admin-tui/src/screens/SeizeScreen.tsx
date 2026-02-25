import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";

type Step = "from" | "to" | "amount";

const STEP_ORDER: Step[] = ["from", "to", "amount"];

export function SeizeScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("from");

  useInput((input, key) => {
    if (input === "b" || key.backspace) {
      const idx = STEP_ORDER.indexOf(step);
      if (idx > 0) setStep(STEP_ORDER[idx - 1]);
      else setScreen("main");
    }
  });

  const handleFromSubmit = (value: string) => {
    setFromAddr(value.trim());
    setStep("to");
  };

  const handleToSubmit = (value: string) => {
    setToAddr(value.trim());
    setStep("amount");
  };

  const handleAmountSubmit = async (value: string) => {
    const amt = value.trim();
    if (!amt || !fromAddr || !toAddr || !service || !state.programs) return;
    try {
      await runTx(
        {
          pendingMessage: "Seizing…",
          successMessage: "Seize completed",
        },
        () =>
          service.seize(
            state.programs!.wallet.publicKey,
            new PublicKey(fromAddr),
            new PublicKey(toAddr),
            amt
          )
      );
    } catch {
      // Error set by runTx
    }
  };

  if (!state.mintAddress) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="SEIZE (SSS-2)" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="SEIZE (SSS-2)" />
        <Text color="red">SDK not ready (transfer hook required).</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="SEIZE (SSS-2)" />
      <Text dimColor>From address → treasury</Text>
      {step === "from" && (
        <Box marginTop={1}>
          <Text>From wallet (base58): </Text>
          <TextInput
            value={fromAddr}
            onChange={setFromAddr}
            onSubmit={handleFromSubmit}
            placeholder="source wallet"
          />
        </Box>
      )}
      {step === "to" && (
        <Box marginTop={1}>
          <Text>Treasury wallet (base58): </Text>
          <TextInput
            value={toAddr}
            onChange={setToAddr}
            onSubmit={handleToSubmit}
            placeholder="treasury wallet"
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
            placeholder="e.g. 1000"
          />
        </Box>
      )}
      <Box marginTop={1}><Footer keys="q/Esc main menu · b previous step" /></Box>
    </Box>
  );
}

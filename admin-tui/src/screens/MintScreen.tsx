import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";

export function MintScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"recipient" | "amount">("recipient");
  const [recipientError, setRecipientError] = useState<string | null>(null);

  useInput((input, key) => {
    if (input === "b" || key.backspace) {
      if (step === "amount") setStep("recipient");
      else setScreen("main");
    }
  });

  const handleRecipientSubmit = (value: string) => {
    const v = value.trim();
    setRecipientError(null);
    if (!v) return;
    try {
      new PublicKey(v);
      setRecipient(v);
      setStep("amount");
    } catch {
      setRecipientError("Invalid base58 address");
    }
  };

  const handleAmountSubmit = async (value: string) => {
    const amt = value.trim();
    if (!amt) return;
    setAmount(amt);
    if (!service || !state.programs) {
      return;
    }
    try {
      await runTx(
        { pendingMessage: "Minting…", successMessage: "Minted successfully" },
        () =>
          service.mint(
            state.programs!.wallet.publicKey,
            new PublicKey(recipient),
            amt
          )
      );
    } catch {
      // Error already set by runTx
    }
  };

  if (!state.mintAddress) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="MINT" />
        <Text color="red">Mint not set. Use Set / change mint from main menu.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="MINT" />
        <Text color="red">SDK not ready.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="MINT" />
      {step === "recipient" && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text>Recipient (base58): </Text>
            <TextInput
              value={recipient}
              onChange={(val) => { setRecipient(val); setRecipientError(null); }}
              onSubmit={handleRecipientSubmit}
              placeholder="wallet address"
            />
          </Box>
          {recipientError && (
            <Text color="red">{recipientError}</Text>
          )}
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
      <Box marginTop={1}>
        <Footer keys="q/Esc main menu · b previous step" />
      </Box>
    </Box>
  );
}

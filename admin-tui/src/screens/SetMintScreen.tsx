import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { PublicKey } from "@solana/web3.js";
import { writeSavedMint, readSavedMint, clearSavedMint } from "../services/mintStorage.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";

type Step = "paste" | "save";

export function SetMintScreen() {
  const { state, setScreen, setMint } = useApp();
  const [value, setValue] = useState(state.mintAddress?.toBase58() ?? "");
  const [step, setStep] = useState<Step>("paste");
  const [pendingMint, setPendingMint] = useState<PublicKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyMintAndGoMain = (pubkey: PublicKey, save: boolean) => {
    setMint(pubkey);
    if (state.sdk) state.sdk.mintAddress = pubkey;
    if (save) writeSavedMint(pubkey);
    setPendingMint(null);
    setStep("paste");
    setScreen("main");
  };

  useInput((input, key) => {
    if (input === "b" || key.backspace) {
      if (step === "save") {
        setStep("paste");
        setPendingMint(null);
      } else {
        setScreen("main");
      }
      return;
    }
    if (step === "paste" && (input === "c" || input === "C")) {
      if (readSavedMint() !== null) {
        clearSavedMint();
        setMint(null);
        if (state.sdk) state.sdk.mintAddress = undefined;
        setScreen("main");
      }
      return;
    }
    if (step === "save" && pendingMint) {
      if (input === "y" || input === "n") {
        applyMintAndGoMain(pendingMint, input === "y");
      } else if (input === "q" || key.escape) {
        applyMintAndGoMain(pendingMint, false);
      }
    }
  });

  const handlePasteSubmit = (raw: string) => {
    const v = raw.trim();
    setError(null);
    if (!v) {
      setMint(null);
      if (state.sdk) state.sdk.mintAddress = undefined;
      setScreen("main");
      return;
    }
    try {
      const pubkey = new PublicKey(v);
      setPendingMint(pubkey);
      setStep("save");
    } catch {
      setError("Invalid base58 address");
    }
  };

  if (step === "save" && pendingMint) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="SET MINT" />
        <Text color="green">✓ Mint: {pendingMint.toBase58().slice(0, 20)}…</Text>
        <Text>Save for next time? <Text bold>y</Text> / <Text bold>n</Text></Text>
        <Box marginTop={1}>
          <Footer keys="q/Esc use without saving · b back" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="SET MINT" />
      <Text dimColor>
        Paste base58 address · Enter empty to skip
        {readSavedMint() !== null ? " · c clear saved" : ""}
      </Text>
      <Box marginTop={1}>
        <Text>Mint (base58): </Text>
        <TextInput
          value={value}
          onChange={(v) => { setValue(v); setError(null); }}
          onSubmit={handlePasteSubmit}
          placeholder="paste address or Enter to skip"
        />
      </Box>
      {error && <Text color="red">{error}</Text>}
      <Box marginTop={1}>
        <Footer keys="q/Esc main menu · b back" />
      </Box>
    </Box>
  );
}

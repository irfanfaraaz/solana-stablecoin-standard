import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";

interface Item {
  label: string;
  value: "confirm" | "cancel";
}

const ITEMS: Item[] = [
  { label: "Yes, unpause mint", value: "confirm" },
  { label: "Cancel", value: "cancel" },
];

export function UnpauseScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();

  const handleSelect = async (item: Item) => {
    if (item.value === "cancel") {
      setScreen("main");
      return;
    }
    if (!service || !state.programs) return;
    try {
      await runTx(
        { pendingMessage: "Unpausing…", successMessage: "Mint unpaused" },
        () => service.unpause(state.programs!.wallet.publicKey)
      );
    } catch {
      // Error set by runTx
    }
  };

  if (!state.mintAddress) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="UNPAUSE" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="UNPAUSE" />
        <Text color="red">SDK not ready.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="UNPAUSE" />
      <Box marginTop={1}>
        <SelectInput items={ITEMS} onSelect={handleSelect} />
      </Box>
      <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
    </Box>
  );
}

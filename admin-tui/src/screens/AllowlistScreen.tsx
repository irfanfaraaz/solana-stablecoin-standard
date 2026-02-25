import React, { useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";

type Mode = "menu" | "add" | "remove";

interface MenuItem {
  label: string;
  value: "add" | "remove" | "back";
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Add to allowlist", value: "add" },
  { label: "Remove from allowlist", value: "remove" },
  { label: "Back to main", value: "back" },
];

export function AllowlistScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [mode, setMode] = useState<Mode>("menu");
  const [address, setAddress] = useState("");

  const handleMenuSelect = (item: MenuItem) => {
    if (item.value === "back") {
      setScreen("main");
      return;
    }
    setMode(item.value);
    setAddress("");
  };

  const handleAddSubmit = async (value: string) => {
    const addr = value.trim();
    if (!addr || !service || !state.programs) return;
    try {
      await runTx(
        {
          pendingMessage: "Adding to allowlist…",
          successMessage: "Added to allowlist",
        },
        () =>
          service.addToAllowlist(
            state.programs!.wallet.publicKey,
            new PublicKey(addr)
          )
      );
    } catch {
      // Error set by runTx
    }
  };

  const handleRemoveSubmit = async (value: string) => {
    const addr = value.trim();
    if (!addr || !service || !state.programs) return;
    try {
      await runTx(
        {
          pendingMessage: "Removing from allowlist…",
          successMessage: "Removed from allowlist",
        },
        () =>
          service.removeFromAllowlist(
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
        <SectionHeader title="ALLOWLIST (SSS-3)" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="ALLOWLIST (SSS-3)" />
        <Text color="red">SDK not ready.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (mode === "menu") {
    return (
      <Box flexDirection="column">
        <SectionHeader title="ALLOWLIST (SSS-3)" />
        <Box marginTop={1}>
          <SelectInput items={MENU_ITEMS} onSelect={handleMenuSelect} />
        </Box>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (mode === "add") {
    return (
      <Box flexDirection="column">
        <SectionHeader title="ADD TO ALLOWLIST" />
        <Text dimColor>Master authority only</Text>
        <Box marginTop={1}>
          <Text>Wallet (base58): </Text>
          <TextInput
            value={address}
            onChange={setAddress}
            onSubmit={handleAddSubmit}
            placeholder="address"
          />
        </Box>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="REMOVE FROM ALLOWLIST" />
      <Box marginTop={1}>
        <Text>Wallet (base58): </Text>
        <TextInput
          value={address}
          onChange={setAddress}
          onSubmit={handleRemoveSubmit}
          placeholder="address"
        />
      </Box>
      <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
    </Box>
  );
}

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { Footer } from "../components/Footer.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";

type Mode = "menu" | "add" | "remove";
type AddStep = "address" | "reason";

interface MenuItem {
  label: string;
  value: "add" | "remove" | "back";
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Add to blacklist", value: "add" },
  { label: "Remove from blacklist", value: "remove" },
  { label: "Back to main", value: "back" },
];

export function BlacklistScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [mode, setMode] = useState<Mode>("menu");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [addStep, setAddStep] = useState<AddStep>("address");

  useInput((input, key) => {
    if (input === "b" || key.backspace) {
      if (mode === "add") {
        if (addStep === "reason") setAddStep("address");
        else setScreen("main");
      } else if (mode === "remove") {
        setScreen("main");
      } else {
        setScreen("main");
      }
    }
  });

  const handleMenuSelect = (item: MenuItem) => {
    if (item.value === "back") {
      setScreen("main");
      return;
    }
    setMode(item.value);
    setAddress("");
    setReason("");
    setAddStep("address");
  };

  const handleAddAddressSubmit = (value: string) => {
    setAddress(value.trim());
    setAddStep("reason");
  };

  const handleRemoveSubmit = async (value: string) => {
    const addr = value.trim();
    if (!addr || !service || !state.programs) return;
    try {
      await runTx(
        {
          pendingMessage: "Removing from blacklist…",
          successMessage: "Removed from blacklist",
        },
        () =>
          service.removeFromBlacklist(
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
        <SectionHeader title="BLACKLIST (SSS-2)" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="BLACKLIST (SSS-2)" />
        <Text color="red">SDK not ready (transfer hook required).</Text>
        <Box marginTop={1}><Footer keys="q/Esc main menu" /></Box>
      </Box>
    );
  }

  if (mode === "menu") {
    return (
      <Box flexDirection="column">
        <SectionHeader title="BLACKLIST (SSS-2)" />
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
        <SectionHeader title="ADD TO BLACKLIST" />
        {addStep === "address" && (
          <Box marginTop={1}>
            <Text>Wallet (base58): </Text>
            <TextInput
              value={address}
              onChange={setAddress}
              onSubmit={handleAddAddressSubmit}
              placeholder="address"
            />
          </Box>
        )}
        {addStep === "reason" && (
          <Box marginTop={1}>
            <Text>Reason (optional, Enter to submit): </Text>
            <TextInput
              value={reason}
              onChange={setReason}
              onSubmit={async () => {
                if (!address || !service || !state.programs) return;
                try {
                  await runTx(
                    {
                      pendingMessage: "Adding to blacklist…",
                      successMessage: "Added to blacklist",
                    },
                    () =>
                      service.addToBlacklist(
                        state.programs!.wallet.publicKey,
                        new PublicKey(address),
                        reason.trim() || undefined
                      )
                  );
                } catch {
                  // Error set by runTx
                }
              }}
              placeholder="reason"
            />
          </Box>
        )}
        <Box marginTop={1}><Footer keys="q/Esc main menu · b back" /></Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader title="REMOVE FROM BLACKLIST" />
      <Box marginTop={1}>
        <Text>Wallet (base58): </Text>
        <TextInput
          value={address}
          onChange={setAddress}
          onSubmit={handleRemoveSubmit}
          placeholder="address"
        />
      </Box>
      <Box marginTop={1}><Footer keys="q/Esc main menu · b back" /></Box>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { useApp } from "../context/AppContext.js";
import type { Screen } from "../state/AppState.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { KeyValueRow } from "../components/KeyValueRow.js";
import { Footer } from "../components/Footer.js";
import { theme } from "../theme.js";

interface Item {
  label: string;
  value: Screen | "quit";
}

const MAIN_ITEMS: Item[] = [
  { label: "Set / change mint", value: "set_mint" },
  { label: "Status (config, supply, pause)", value: "status" },
  { label: "Roles (assign / revoke)", value: "roles" },
  { label: "Mint tokens", value: "mint" },
  { label: "Burn tokens", value: "burn" },
  { label: "Freeze account", value: "freeze" },
  { label: "Thaw account", value: "thaw" },
  { label: "Pause mint", value: "pause" },
  { label: "Unpause mint", value: "unpause" },
  { label: "Blacklist (SSS-2)", value: "blacklist" },
  { label: "Allowlist (SSS-3)", value: "allowlist" },
  { label: "Seize (SSS-2)", value: "seize" },
  { label: "Quit", value: "quit" },
];

function shortUrl(url: string): string {
  try {
    const u = url.replace(/^https?:\/\//, "").split("/")[0];
    return u.length > 20 ? u.slice(0, 18) + "…" : u;
  } catch {
    return url.slice(0, 12) + "…";
  }
}

export function MainMenu() {
  const { state, setScreen } = useApp();

  const handleSelect = (item: Item) => {
    if (item.value === "quit") {
      process.exit(0);
    }
    setScreen(item.value as Screen);
  };

  const rpcShort = state.rpcUrl ? shortUrl(state.rpcUrl) : "—";
  const keypairShort = state.programs?.wallet.publicKey
    ? state.programs.wallet.publicKey.toBase58().slice(0, 8) + "…"
    : "—";
  const mintShort = state.mintAddress
    ? state.mintAddress.toBase58().slice(0, 8) + "…"
    : "not set";

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={theme.brandBright}>
          ╭─ SSS Admin ─╮
        </Text>
      </Box>
      <SectionHeader title="CONTEXT" />
      <Box marginY={1} flexDirection="column" gap={1}>
        <KeyValueRow label="RPC" value={rpcShort} dimValue />
        <KeyValueRow label="Keypair" value={keypairShort} dimValue />
        <KeyValueRow
          label="Mint"
          value={mintShort}
          dimValue={!!state.mintAddress}
          valueColor={!state.mintAddress ? "warning" : undefined}
        />
      </Box>
      <SectionHeader title="ACTIONS" />
      <Box marginTop={1}>
        <SelectInput items={MAIN_ITEMS} onSelect={handleSelect} />
      </Box>
      <Box marginTop={1}>
        <Footer keys="q/Esc back · Ctrl+C quit" />
      </Box>
    </Box>
  );
}

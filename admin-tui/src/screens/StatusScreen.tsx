import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useApp } from "../context/AppContext.js";
import type {
  StablecoinConfigAccount,
  RoleAccountData,
} from "@stbr/sss-token";
import { Footer } from "../components/Footer.js";
import { KeyValueRow } from "../components/KeyValueRow.js";
import { theme } from "../theme.js";

export function StatusScreen() {
  const { state } = useApp();
  const [config, setConfig] = useState<StablecoinConfigAccount | null>(null);
  const [roles, setRoles] = useState<RoleAccountData | null>(null);
  const [supply, setSupply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useInput((input) => {
    if (input === "r") setRefreshKey((k) => k + 1);
  });

  useEffect(() => {
    if (!state.sdk || !state.mintAddress) {
      setError("Mint not set. Set mint from main menu.");
      return;
    }
    setError(null);
    setConfig(null);
    let cancelled = false;
    (async () => {
      try {
        const [cfg, r, sup] = await Promise.all([
          state.sdk!.getConfig(),
          state.sdk!.getRoles(),
          state.sdk!.getTotalSupply(),
        ]);
        if (!cancelled) {
          setConfig(cfg);
          setRoles(r);
          setSupply(sup.toString());
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.sdk, state.mintAddress, refreshKey]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · r refresh" />
        </Box>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Loading status…</Text>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · r refresh" />
        </Box>
      </Box>
    );
  }

  const shortAddr = (pk: { toBase58(): string }): string => {
    const s = pk.toBase58();
    return s.length > 20 ? s.slice(0, 8) + "…" + s.slice(-8) : s;
  };

  return (
    <Box flexDirection="column" gap={0}>
      <Box marginBottom={1} flexDirection="column" gap={0}>
        <Text bold color={theme.brand}>Status</Text>
        <Text color={theme.muted} dimColor>q/Esc: main menu · r: refresh</Text>
      </Box>
      <Box flexDirection="column" gap={1}>
        <KeyValueRow label="Mint" value={shortAddr(state.mintAddress!)} dimValue />
        <KeyValueRow label="Decimals" value={String(config.decimals)} />
        <KeyValueRow
          label="Paused"
          value={config.isPaused ? "Yes" : "No"}
          valueColor={config.isPaused ? "error" : "success"}
        />
        <KeyValueRow label="Supply" value={supply ?? "—"} valueColor="success" />
        <KeyValueRow label="Master" value={shortAddr(config.masterAuthority)} dimValue />
      </Box>
      {roles && (
        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text bold color={theme.accent}>Roles</Text>
          <KeyValueRow label="Burner" value={shortAddr(roles.burner)} dimValue />
          <KeyValueRow label="Pauser" value={shortAddr(roles.pauser)} dimValue />
          <KeyValueRow label="Blacklister" value={shortAddr(roles.blacklister)} dimValue />
          <KeyValueRow label="Seizer" value={shortAddr(roles.seizer)} dimValue />
        </Box>
      )}
      <Box marginTop={1}>
        <Footer keys="q/Esc main menu · r refresh" />
      </Box>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useApp } from "../context/AppContext.js";
import type {
  StablecoinConfigAccount,
  RoleAccountData,
} from "@stbr/sss-token";
import { Footer } from "../components/Footer.js";

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

  return (
    <Box flexDirection="column">
      <Text bold>Status</Text>
      <Text dimColor>q/Esc: main menu · r: refresh</Text>
      <Text>Mint: {state.mintAddress!.toBase58()}</Text>
      <Text>Decimals: {config.decimals}</Text>
      <Text>Paused: {config.isPaused ? "Yes" : "No"}</Text>
      <Text>Supply: {supply ?? "—"}</Text>
      <Text>Master: {config.masterAuthority.toBase58().slice(0, 12)}…</Text>
      {roles && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Roles</Text>
          <Text>Burner: {roles.burner.toBase58().slice(0, 12)}…</Text>
          <Text>Pauser: {roles.pauser.toBase58().slice(0, 12)}…</Text>
          <Text>Blacklister: {roles.blacklister.toBase58().slice(0, 12)}…</Text>
          <Text>Seizer: {roles.seizer.toBase58().slice(0, 12)}…</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Footer keys="q/Esc main menu · r refresh" />
      </Box>
    </Box>
  );
}

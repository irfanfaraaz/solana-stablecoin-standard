import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useApp } from "../context/AppContext.js";
import { SectionHeader } from "../components/SectionHeader.js";
import { KeyValueRow } from "../components/KeyValueRow.js";
import { Footer } from "../components/Footer.js";
import { theme } from "../theme.js";
import { useStablecoinService } from "../hooks/useStablecoinService.js";
import { useRunTransaction } from "../hooks/useRunTransaction.js";
import { PublicKey } from "@solana/web3.js";
import type { RoleAccountData, StablecoinConfigAccount } from "@stbr/sss-token";

type Mode = "menu" | "assign" | "revoke";
type RoleKey = "burner" | "pauser" | "blacklister" | "seizer";

const ROLE_KEYS: RoleKey[] = ["burner", "pauser", "blacklister", "seizer"];
const ROLE_LABELS: Record<RoleKey, string> = {
  burner: "Burner",
  pauser: "Pauser",
  blacklister: "Blacklister",
  seizer: "Seizer",
};

interface MenuItem {
  label: string;
  value: "assign" | "revoke" | "back";
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Assign role to address", value: "assign" },
  { label: "Revoke role (set to master)", value: "revoke" },
  { label: "Back to main", value: "back" },
];

function shortAddr(pk: PublicKey): string {
  const s = pk.toBase58();
  return s.length > 16 ? s.slice(0, 8) + "…" + s.slice(-8) : s;
}

export function RolesScreen() {
  const { state, setScreen } = useApp();
  const service = useStablecoinService();
  const runTx = useRunTransaction();
  const [config, setConfig] = useState<StablecoinConfigAccount | null>(null);
  const [roles, setRoles] = useState<RoleAccountData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [address, setAddress] = useState("");
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
    let cancelled = false;
    (async () => {
      try {
        const [cfg, r] = await Promise.all([
          state.sdk!.getConfig(),
          state.sdk!.getRoles(),
        ]);
        if (!cancelled) {
          setConfig(cfg);
          setRoles(r);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.sdk, state.mintAddress, refreshKey]);

  const handleMenuSelect = (item: MenuItem) => {
    if (item.value === "back") {
      setScreen("main");
      return;
    }
    setMode(item.value);
    setSelectedRole(null);
    setAddress("");
  };

  const roleItems = ROLE_KEYS.map((key) => ({
    label: `${ROLE_LABELS[key]}  ${roles ? shortAddr(roles[key]) : "—"}`,
    value: key,
  }));
  const backItem = { label: "← Back", value: "back" as const };
  const roleSelectItems = [...roleItems, backItem];

  const handleRoleSelect = (item: { value: RoleKey | "back" }) => {
    if (item.value === "back") {
      setMode("menu");
      setSelectedRole(null);
      setAddress("");
      return;
    }
    setSelectedRole(item.value);
    setAddress("");
  };

  const handleAssignSubmit = async (value: string) => {
    const addr = value.trim();
    if (!addr || !service || !state.programs || !selectedRole) return;
    try {
      await runTx(
        {
          pendingMessage: `Assigning ${ROLE_LABELS[selectedRole]}…`,
          successMessage: `${ROLE_LABELS[selectedRole]} assigned`,
        },
        () =>
          service.updateRoles(state.programs!.wallet.publicKey, {
            [selectedRole]: new PublicKey(addr),
          })
      );
      setMode("menu");
      setSelectedRole(null);
      setAddress("");
      setRefreshKey((k) => k + 1);
    } catch {
      // Error set by runTx
    }
  };

  const handleRevokeConfirm = async () => {
    if (!config || !service || !state.programs || !selectedRole) return;
    try {
      await runTx(
        {
          pendingMessage: `Revoking ${ROLE_LABELS[selectedRole]}…`,
          successMessage: `${ROLE_LABELS[selectedRole]} revoked`,
        },
        () =>
          service.updateRoles(state.programs!.wallet.publicKey, {
            [selectedRole]: config.masterAuthority,
          })
      );
      setMode("menu");
      setSelectedRole(null);
      setRefreshKey((k) => k + 1);
    } catch {
      // Error set by runTx
    }
  };

  if (error) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="ROLES" />
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · r refresh" />
        </Box>
      </Box>
    );
  }

  if (!state.mintAddress) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="ROLES" />
        <Text color="red">Mint not set.</Text>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu" />
        </Box>
      </Box>
    );
  }

  if (mode === "menu") {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column" gap={0}>
          <Text bold color={theme.brandBright}>
            Roles
          </Text>
          <Text color={theme.muted} dimColor>Master can assign or revoke burner, pauser, blacklister, seizer.</Text>
        </Box>
        <SectionHeader title="CURRENT ROLES" />
        <Box marginY={1} paddingLeft={1} flexDirection="column" gap={1}>
          {roles &&
            ROLE_KEYS.map((key) => (
              <KeyValueRow
                key={key}
                label={ROLE_LABELS[key]}
                value={shortAddr(roles[key])}
                dimValue
              />
            ))}
        </Box>
        <SectionHeader title="ACTIONS" />
        <Box marginTop={1}>
          <SelectInput items={MENU_ITEMS} onSelect={handleMenuSelect} />
        </Box>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · r refresh" />
        </Box>
      </Box>
    );
  }

  if (mode === "assign" && selectedRole === null) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="ASSIGN ROLE — choose role" />
        <Box marginTop={1}>
          <SelectInput
            items={roleSelectItems}
            onSelect={handleRoleSelect}
          />
        </Box>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · r refresh · select then enter address" />
        </Box>
      </Box>
    );
  }

  if (mode === "assign" && selectedRole) {
    return (
      <Box flexDirection="column">
        <SectionHeader title={`ASSIGN ${ROLE_LABELS[selectedRole].toUpperCase()}`} />
        <Box marginTop={1}>
          <Text color={theme.label}>New address (base58): </Text>
          <TextInput
            value={address}
            onChange={setAddress}
            onSubmit={handleAssignSubmit}
            placeholder="Pubkey…"
          />
        </Box>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · Enter submit · r refresh" />
        </Box>
      </Box>
    );
  }

  if (mode === "revoke" && selectedRole === null) {
    return (
      <Box flexDirection="column">
        <SectionHeader title="REVOKE ROLE — choose role" />
        <Box marginTop={1}>
          <SelectInput
            items={roleSelectItems}
            onSelect={handleRoleSelect}
          />
        </Box>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu · r refresh" />
        </Box>
      </Box>
    );
  }

  if (mode === "revoke" && selectedRole) {
    return (
      <Box flexDirection="column">
        <SectionHeader title={`REVOKE ${ROLE_LABELS[selectedRole].toUpperCase()}`} />
        <Box marginTop={1}>
          <Text>
            Set <Text color={theme.warning}>{ROLE_LABELS[selectedRole]}</Text> back to master (
            {config ? shortAddr(config.masterAuthority) : "—"}).
          </Text>
          <Text dimColor> Confirm by selecting "Confirm revoke" below.</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: "Confirm revoke", value: "confirm" },
              { label: "← Back", value: "back" },
            ]}
            onSelect={(item) => {
              if (item.value === "confirm") handleRevokeConfirm();
              else setSelectedRole(null);
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Footer keys="q/Esc main menu" />
        </Box>
      </Box>
    );
  }

  return null;
}

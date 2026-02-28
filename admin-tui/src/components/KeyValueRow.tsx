import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

const LABEL_WIDTH = 10;
const LABEL_VALUE_GAP = 2;

export function KeyValueRow({
  label,
  value,
  dimValue,
  valueColor,
}: {
  label: string;
  value: string;
  dimValue?: boolean;
  /** Optional: success (green), warning (yellow), error (red) for value */
  valueColor?: "success" | "warning" | "error";
}) {
  const valueStyle =
    valueColor === "success"
      ? { color: theme.success }
      : valueColor === "warning"
        ? { color: theme.warning }
        : valueColor === "error"
          ? { color: theme.error }
          : dimValue
            ? { dimColor: true }
            : {};
  return (
    <Box>
      <Text color={theme.label}>{label.padEnd(LABEL_WIDTH + LABEL_VALUE_GAP)}</Text>
      <Text {...valueStyle}>{value}</Text>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";

const LABEL_WIDTH = 12;

export function KeyValueRow({
  label,
  value,
  dimValue,
}: {
  label: string;
  value: string;
  dimValue?: boolean;
}) {
  const padding = Math.max(0, LABEL_WIDTH - label.length);
  return (
    <Box>
      <Text dimColor>{label.padEnd(LABEL_WIDTH)}</Text>
      <Text {...(dimValue ? { dimColor: true } : {})}>{value}</Text>
    </Box>
  );
}

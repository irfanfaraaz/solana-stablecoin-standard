import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

const WIDTH = 52;

export function SectionHeader({ title }: { title: string }) {
  const dashLen = Math.max(0, WIDTH - title.length - 2);
  const left = Math.floor(dashLen / 2);
  const right = dashLen - left;
  return (
    <Box>
      <Text dimColor>{"─".repeat(left)}</Text>
      <Text color={theme.brand} bold>{" " + title + " "}</Text>
      <Text dimColor>{"─".repeat(right)}</Text>
    </Box>
  );
}

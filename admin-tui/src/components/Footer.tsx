import React from "react";
import { Text } from "ink";
import { theme } from "../theme.js";

export function Footer({ keys }: { keys: string }) {
  return (
    <Text color={theme.muted} dimColor italic>
      {keys}
    </Text>
  );
}

import React from "react";
import { Text } from "ink";

export function Footer({ keys }: { keys: string }) {
  return (
    <Text dimColor italic>
      {keys}
    </Text>
  );
}

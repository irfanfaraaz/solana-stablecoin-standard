import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { TxStatus } from "../state/AppState.js";

interface TransactionStatusProps {
  status: TxStatus;
  message: string;
  signature?: string | null;
}

export function TransactionStatus({
  status,
  message,
  signature,
}: TransactionStatusProps) {
  if (status === "idle") return null;

  return (
    <Box flexDirection="column" marginY={1}>
      {status === "pending" && (
        <Text color="cyan">
          <Spinner type="dots" /> {message}
        </Text>
      )}
      {status === "success" && (
        <>
          <Text color="green">✓ {message}</Text>
          {signature && (
            <Text color="gray" dimColor>
              {signature}
            </Text>
          )}
        </>
      )}
      {status === "error" && (
        <Text color="red">✗ {message}</Text>
      )}
    </Box>
  );
}

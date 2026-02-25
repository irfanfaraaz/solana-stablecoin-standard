import React from "react";
import { useInput } from "ink";
import { Box } from "ink";
import { useApp } from "./context/AppContext.js";
import { MainMenu } from "./screens/MainMenu.js";
import { StatusScreen } from "./screens/StatusScreen.js";
import { MintScreen } from "./screens/MintScreen.js";
import { BurnScreen } from "./screens/BurnScreen.js";
import { FreezeScreen } from "./screens/FreezeScreen.js";
import { ThawScreen } from "./screens/ThawScreen.js";
import { PauseScreen } from "./screens/PauseScreen.js";
import { UnpauseScreen } from "./screens/UnpauseScreen.js";
import { BlacklistScreen } from "./screens/BlacklistScreen.js";
import { AllowlistScreen } from "./screens/AllowlistScreen.js";
import { SeizeScreen } from "./screens/SeizeScreen.js";
import { SetMintScreen } from "./screens/SetMintScreen.js";
import { TransactionStatus } from "./components/TransactionStatus.js";

function ScreenRouter({ screen }: { screen: string }) {
  switch (screen) {
    case "main":
      return <MainMenu />;
    case "set_mint":
      return <SetMintScreen />;
    case "status":
      return <StatusScreen />;
    case "mint":
      return <MintScreen />;
    case "burn":
      return <BurnScreen />;
    case "freeze":
      return <FreezeScreen />;
    case "thaw":
      return <ThawScreen />;
    case "pause":
      return <PauseScreen />;
    case "unpause":
      return <UnpauseScreen />;
    case "blacklist":
      return <BlacklistScreen />;
    case "allowlist":
      return <AllowlistScreen />;
    case "seize":
      return <SeizeScreen />;
    default:
      return <Box>Unknown screen: {screen}</Box>;
  }
}

export function App() {
  const { state, setScreen } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      setScreen("main");
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <ScreenRouter screen={state.screen} />
      <TransactionStatus
        status={state.txStatus}
        message={state.txMessage}
        signature={state.lastSignature}
      />
    </Box>
  );
}

#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { AppProvider } from "./context/AppContext.js";
import { Root } from "./Root.js";

async function main() {
  const app = (
    <AppProvider>
      <Root />
    </AppProvider>
  );
  const { waitUntilExit } = render(app);
  await waitUntilExit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import React from "react";
import { render } from "ink-testing-library";
import { describe, it, expect } from "vitest";
import { AppProvider } from "./context/AppContext.js";
import { App } from "./App.js";

describe("App", () => {
  it("renders main menu with banner and context", () => {
    const { lastFrame } = render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    const output = lastFrame();
    expect(output).toContain("SSS Admin");
    expect(output).toContain("CONTEXT");
    expect(output).toContain("Mint");
  });

  it("main menu lists status and mint actions", () => {
    const { lastFrame } = render(
      <AppProvider>
        <App />
      </AppProvider>
    );
    const output = lastFrame();
    expect(output).toContain("ACTIONS");
    expect(output).toContain("Status");
    expect(output).toContain("Mint tokens");
    expect(output).toContain("Burn tokens");
  });
});

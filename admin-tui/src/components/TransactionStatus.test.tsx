import React from "react";
import { render } from "ink-testing-library";
import { describe, it, expect } from "vitest";
import { TransactionStatus } from "./TransactionStatus.js";

describe("TransactionStatus", () => {
  it("renders nothing when idle", () => {
    const { lastFrame } = render(
      <TransactionStatus status="idle" message="" />
    );
    expect(lastFrame()).toBe("");
  });

  it("renders success message and optional signature", () => {
    const { lastFrame } = render(
      <TransactionStatus
        status="success"
        message="Minted successfully"
        signature="5abc..."
      />
    );
    const output = lastFrame();
    expect(output).toContain("Minted successfully");
    expect(output).toContain("5abc");
  });

  it("renders error message", () => {
    const { lastFrame } = render(
      <TransactionStatus
        status="error"
        message="Account not found"
      />
    );
    expect(lastFrame()).toContain("Account not found");
  });
});

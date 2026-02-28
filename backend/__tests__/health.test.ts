import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

vi.mock("@solana/web3.js", () => {
  const mockGetSlot = vi.fn().mockResolvedValue(123);
  return {
    Connection: vi.fn().mockImplementation(function (this: any) {
      this.getSlot = mockGetSlot;
      return this;
    }),
    PublicKey: class {
      toBase58() {
        return "mock";
      }
    },
    Keypair: {
      fromSecretKey: vi.fn(() => ({ publicKey: {} })),
      generate: vi.fn(() => ({ publicKey: {} })),
    },
  };
});

describe("Backend health", () => {
  let app: import("express").Express;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const mod = await import("../src/app");
    app = mod.app;
  });

  it("GET /health returns 200 when RPC is available", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    expect(res.body).toHaveProperty("rpc");
  });
});

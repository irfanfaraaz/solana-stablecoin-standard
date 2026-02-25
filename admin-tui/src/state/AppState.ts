import { PublicKey } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import type { SolanaStablecoin } from "@stbr/sss-token";
import type { SSSComplianceModule } from "@stbr/sss-token";
import type { LoadedPrograms } from "../services/loaders.js";

export type Screen =
  | "main"
  | "set_mint"
  | "status"
  | "mint"
  | "burn"
  | "freeze"
  | "thaw"
  | "pause"
  | "unpause"
  | "blacklist"
  | "allowlist"
  | "seize";

export type TxStatus = "idle" | "pending" | "success" | "error";

export interface AppState {
  keypairPath: string;
  rpcUrl: string;
  mintAddress: PublicKey | null;
  programs: LoadedPrograms | null;
  sdk: SolanaStablecoin | null;
  compliance: SSSComplianceModule | null;
  screen: Screen;
  txStatus: TxStatus;
  txMessage: string;
  lastSignature: string | null;
}

export const initialAppState: AppState = {
  keypairPath: process.env.KEYPAIR_PATH ?? "~/.config/solana/id.json",
  rpcUrl: process.env.RPC_URL ?? "https://api.devnet.solana.com",
  mintAddress: null,
  programs: null,
  sdk: null,
  compliance: null,
  screen: "main",
  txStatus: "idle",
  txMessage: "",
  lastSignature: null,
};

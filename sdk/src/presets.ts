import { StablecoinConfig } from "./core";

// SSS-1 (Standard Stablecoin Spec 1): Clean, vanilla operations
export const SSS_1_PRESET: Omit<
  StablecoinConfig,
  "name" | "symbol" | "uri" | "decimals"
> = {
  enablePermanentDelegate: false,
  enableTransferHook: false,
  defaultAccountFrozen: false,
};

// SSS-2 (Standard Stablecoin Spec 2): Fully compliant with seize, freeze, and blacklists
export const SSS_2_PRESET: Omit<
  StablecoinConfig,
  "name" | "symbol" | "uri" | "decimals"
> = {
  enablePermanentDelegate: true,
  enableTransferHook: true,
  defaultAccountFrozen: false,
};

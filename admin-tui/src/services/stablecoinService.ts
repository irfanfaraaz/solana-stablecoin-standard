import { PublicKey } from "@solana/web3.js";
import type { SolanaStablecoin } from "@stbr/sss-token";
import type { SSSComplianceModule } from "@stbr/sss-token";

export interface StablecoinService {
  mint(
    authority: PublicKey,
    recipient: PublicKey,
    amount: string
  ): Promise<{ signature: string }>;
  burn(
    authority: PublicKey,
    from: PublicKey,
    amount: string
  ): Promise<{ signature: string }>;
  freezeAccount(
    authority: PublicKey,
    account: PublicKey
  ): Promise<{ signature: string }>;
  thawAccount(
    authority: PublicKey,
    account: PublicKey
  ): Promise<{ signature: string }>;
  pause(authority: PublicKey): Promise<{ signature: string }>;
  unpause(authority: PublicKey): Promise<{ signature: string }>;
  addToBlacklist(
    authority: PublicKey,
    address: PublicKey,
    reason?: string
  ): Promise<{ signature: string }>;
  removeFromBlacklist(
    authority: PublicKey,
    address: PublicKey
  ): Promise<{ signature: string }>;
  addToAllowlist(
    authority: PublicKey,
    wallet: PublicKey
  ): Promise<{ signature: string }>;
  removeFromAllowlist(
    authority: PublicKey,
    wallet: PublicKey
  ): Promise<{ signature: string }>;
  seize(
    authority: PublicKey,
    from: PublicKey,
    toTreasury: PublicKey,
    amount: string
  ): Promise<{ signature: string }>;
  updateRoles(
    authority: PublicKey,
    roles: {
      burner?: PublicKey | null;
      pauser?: PublicKey | null;
      blacklister?: PublicKey | null;
      seizer?: PublicKey | null;
    }
  ): Promise<{ signature: string }>;
}

export function createStablecoinService(
  sdk: SolanaStablecoin,
  compliance: SSSComplianceModule | null
): StablecoinService {
  return {
    async mint(authority, recipient, amount) {
      const tx = await sdk.mint(authority, recipient, amount);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async burn(authority, from, amount) {
      const tx = await sdk.burn(authority, from, amount);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async freezeAccount(authority, account) {
      const tx = await sdk.freezeAccount(authority, account);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async thawAccount(authority, account) {
      const tx = await sdk.thawAccount(authority, account);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async pause(authority) {
      const tx = await sdk.pause(authority);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async unpause(authority) {
      const tx = await sdk.unpause(authority);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async addToBlacklist(authority, address, reason) {
      if (!compliance) throw new Error("Transfer hook not configured (SSS-2)");
      const tx = await compliance.addToBlacklist(authority, address, reason);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async removeFromBlacklist(authority, address) {
      if (!compliance) throw new Error("Transfer hook not configured (SSS-2)");
      const tx = await compliance.removeFromBlacklist(authority, address);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async addToAllowlist(authority, wallet) {
      const tx = await sdk.addToAllowlist(authority, wallet);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async removeFromAllowlist(authority, wallet) {
      const tx = await sdk.removeFromAllowlist(authority, wallet);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async seize(authority, from, toTreasury, amount) {
      if (!compliance) throw new Error("Transfer hook not configured (SSS-2)");
      const tx = await compliance.seize(authority, from, toTreasury, amount);
      const sig = await tx.rpc();
      return { signature: sig };
    },
    async updateRoles(authority, roles) {
      const tx = await sdk.updateRoles(authority, roles);
      const sig = await tx.rpc();
      return { signature: sig };
    },
  };
}

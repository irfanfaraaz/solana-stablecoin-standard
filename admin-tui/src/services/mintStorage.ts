import * as fs from "fs";
import * as path from "path";
import { PublicKey } from "@solana/web3.js";

function getMintFileDir(): string {
  const cwd = process.cwd();
  const inRepoRoot = fs.existsSync(path.join(cwd, "target", "idl", "stablecoin.json"));
  const inAdminTui = fs.existsSync(path.join(cwd, "package.json")) && !inRepoRoot;
  if (inRepoRoot) return path.join(cwd, "admin-tui");
  if (inAdminTui) return cwd;
  return path.join(cwd, "admin-tui");
}

export function getMintFilePath(): string {
  return path.join(getMintFileDir(), ".mint");
}

export function readSavedMint(): PublicKey | null {
  try {
    const filePath = getMintFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return null;
    return new PublicKey(raw);
  } catch {
    return null;
  }
}

export function writeSavedMint(mint: PublicKey): void {
  const filePath = getMintFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, mint.toBase58(), "utf-8");
}

export function clearSavedMint(): void {
  try {
    const filePath = getMintFilePath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

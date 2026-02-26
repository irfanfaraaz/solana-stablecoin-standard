"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const DEFAULT_MINT = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_MINT_ADDRESS?.trim() || null)
  : null;

const MINT_DEBOUNCE_MS = 500;

type MintContextValue = {
  mintAddress: string | null;
  setMintAddress: (value: string | null) => void;
  mintInput: string;
  setMintInput: (value: string) => void;
};

const MintContext = createContext<MintContextValue | null>(null);

export function useMint(): MintContextValue {
  const ctx = useContext(MintContext);
  if (!ctx) throw new Error("useMint must be used within MintProvider");
  return ctx;
}

export function MintProvider({ children }: { children: ReactNode }) {
  const [mintInput, setMintInputState] = useState(DEFAULT_MINT ?? "");
  const [mintAddress, setMintAddress] = useState<string | null>(DEFAULT_MINT || null);

  const setMintInput = useCallback((value: string) => {
    setMintInputState(value);
  }, []);

  useEffect(() => {
    const trimmed = mintInput.trim();
    if (!trimmed) {
      setMintAddress(DEFAULT_MINT || null);
      return;
    }
    const id = setTimeout(() => setMintAddress(trimmed), MINT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [mintInput]);

  const value = useMemo(
    () => ({ mintAddress, setMintAddress, mintInput, setMintInput }),
    [mintAddress, mintInput]
  );

  return (
    <MintContext.Provider value={value}>
      {children}
    </MintContext.Provider>
  );
}

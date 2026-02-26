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
import { getBackendBaseUrl } from "../lib/api";

type SettingsContextValue = {
  useBackend: boolean;
  setUseBackend: (v: boolean) => void;
  toastSignature: string | null;
  showToast: (signature: string) => void;
  clearToast: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const hasBackend = !!getBackendBaseUrl();
  const [useBackend, setUseBackend] = useState(hasBackend);
  const [toastSignature, setToastSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!hasBackend) setUseBackend(false);
  }, [hasBackend]);

  const showToast = useCallback((signature: string) => {
    setToastSignature(signature);
  }, []);

  const clearToast = useCallback(() => {
    setToastSignature(null);
  }, []);

  const value = useMemo(
    () => ({ useBackend, setUseBackend, toastSignature, showToast, clearToast }),
    [useBackend, toastSignature, showToast, clearToast]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

"use client";

import { createContext, useContext, type ReactNode } from "react";

type DirectoryContextValue = {
  openDirectory: () => void;
};

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

export function useDirectoryOpen() {
  const ctx = useContext(DirectoryContext);
  return ctx?.openDirectory ?? (() => {});
}

export function DirectoryProvider({
  openDirectory,
  children,
}: {
  openDirectory: () => void;
  children: ReactNode;
}) {
  return (
    <DirectoryContext.Provider value={{ openDirectory }}>
      {children}
    </DirectoryContext.Provider>
  );
}

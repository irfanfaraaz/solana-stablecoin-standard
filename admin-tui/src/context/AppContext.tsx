import React, { createContext, useContext, useCallback, useReducer } from "react";
import { PublicKey } from "@solana/web3.js";
import type { AppState, Screen, TxStatus } from "../state/AppState.js";
import { initialAppState } from "../state/AppState.js";

type Action =
  | { type: "SET_PROGRAMS"; payload: AppState["programs"] }
  | { type: "SET_SDK"; payload: AppState["sdk"] }
  | { type: "SET_COMPLIANCE"; payload: AppState["compliance"] }
  | { type: "SET_MINT"; payload: PublicKey | null }
  | { type: "SET_SCREEN"; payload: Screen }
  | { type: "SET_TX"; payload: { status: TxStatus; message: string; signature?: string | null } }
  | { type: "SET_KEYPAIR_PATH"; payload: string }
  | { type: "SET_RPC_URL"; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROGRAMS":
      return { ...state, programs: action.payload };
    case "SET_SDK":
      return { ...state, sdk: action.payload };
    case "SET_COMPLIANCE":
      return { ...state, compliance: action.payload };
    case "SET_MINT":
      return { ...state, mintAddress: action.payload };
    case "SET_SCREEN":
      return { ...state, screen: action.payload };
    case "SET_TX":
      return {
        ...state,
        txStatus: action.payload.status,
        txMessage: action.payload.message,
        lastSignature: action.payload.signature ?? state.lastSignature,
      };
    case "SET_KEYPAIR_PATH":
      return { ...state, keypairPath: action.payload };
    case "SET_RPC_URL":
      return { ...state, rpcUrl: action.payload };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setPrograms: (p: AppState["programs"]) => void;
  setSdk: (s: AppState["sdk"]) => void;
  setCompliance: (c: AppState["compliance"]) => void;
  setMint: (m: PublicKey | null) => void;
  setScreen: (s: Screen) => void;
  setTxStatus: (status: TxStatus, message: string, signature?: string | null) => void;
  setKeypairPath: (p: string) => void;
  setRpcUrl: (u: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialAppState);

  const setPrograms = useCallback((p: AppState["programs"]) => {
    dispatch({ type: "SET_PROGRAMS", payload: p });
  }, []);
  const setSdk = useCallback((s: AppState["sdk"]) => {
    dispatch({ type: "SET_SDK", payload: s });
  }, []);
  const setCompliance = useCallback((c: AppState["compliance"]) => {
    dispatch({ type: "SET_COMPLIANCE", payload: c });
  }, []);
  const setMint = useCallback((m: PublicKey | null) => {
    dispatch({ type: "SET_MINT", payload: m });
  }, []);
  const setScreen = useCallback((s: Screen) => {
    dispatch({ type: "SET_SCREEN", payload: s });
  }, []);
  const setTxStatus = useCallback(
    (status: TxStatus, message: string, signature?: string | null) => {
      dispatch({
        type: "SET_TX",
        payload: { status, message, signature },
      });
    },
    []
  );
  const setKeypairPath = useCallback((p: string) => {
    dispatch({ type: "SET_KEYPAIR_PATH", payload: p });
  }, []);
  const setRpcUrl = useCallback((u: string) => {
    dispatch({ type: "SET_RPC_URL", payload: u });
  }, []);

  const value: AppContextValue = {
    state,
    setPrograms,
    setSdk,
    setCompliance,
    setMint,
    setScreen,
    setTxStatus,
    setKeypairPath,
    setRpcUrl,
  };

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

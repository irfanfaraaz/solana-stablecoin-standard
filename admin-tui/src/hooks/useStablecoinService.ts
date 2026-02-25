import { useMemo } from "react";
import { useApp } from "../context/AppContext.js";
import {
  createStablecoinService,
  type StablecoinService,
} from "../services/stablecoinService.js";

export function useStablecoinService(): StablecoinService | null {
  const { state } = useApp();
  return useMemo(() => {
    if (!state.sdk) return null;
    return createStablecoinService(state.sdk, state.compliance);
  }, [state.sdk, state.compliance]);
}

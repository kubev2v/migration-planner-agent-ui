import { useAppSelector } from "./hooks";
import { type AppMode, selectAppMode } from "./slices/appModeSlice";

/**
 * Reads the three-way application mode from the client-state slice. The slice is
 * seeded from agent status by `useSeedAppMode`, so nav and mode-gated flows read
 * one reconciled value instead of re-deriving it from `AgentStatus` fields.
 */
export function useAppMode(): AppMode {
  return useAppSelector(selectAppMode);
}

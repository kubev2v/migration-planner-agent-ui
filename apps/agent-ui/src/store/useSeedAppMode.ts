import { useEffect } from "react";
import { useAgentStatus } from "../common/useAgentStatus";
import { useAppDispatch } from "./hooks";
import { setAppMode } from "./slices/appModeSlice";

/**
 * Seeds the `appMode` client-state slice from agent status. The three-way mode
 * spans two SDK fields: `rvtoolsModeEnabled` (a boolean) takes precedence,
 * otherwise `AgentStatus.mode` (`connected`/`disconnected`) is used.
 */
export function useSeedAppMode(): void {
  const dispatch = useAppDispatch();
  const { agentStatus } = useAgentStatus();

  useEffect(() => {
    if (!agentStatus) {
      return;
    }
    dispatch(
      setAppMode(agentStatus.rvtoolsModeEnabled ? "rvtool" : agentStatus.mode),
    );
  }, [agentStatus, dispatch]);
}

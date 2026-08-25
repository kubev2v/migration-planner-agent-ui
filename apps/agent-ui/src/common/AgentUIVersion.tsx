import type React from "react";
import { useAppMode } from "../store/useAppMode";
import { useSeedAppMode } from "../store/useSeedAppMode";
import { useAgentStatus } from "./useAgentStatus";

export const AgentUIVersion: React.FC = () => {
  const { agentStatus, error } = useAgentStatus();
  // Seed the client-state app mode from agent status at the always-mounted
  // masthead level (not just inside the report shell), so nav and mode-gated
  // reads across the app share one reconciled `connected`/`disconnected`/
  // `rvtool` value instead of re-deriving it from `AgentStatus`.
  useSeedAppMode();
  const appMode = useAppMode();

  if (error) {
    return (
      <div data-testid="agent-api-lib-version" hidden>
        Error: {error}
      </div>
    );
  }

  if (!agentStatus) {
    return (
      <div data-testid="agent-api-lib-version" hidden>
        Loading...
      </div>
    );
  }

  return (
    <div data-testid="agent-api-lib-version" hidden>
      Agent: {appMode} - Connection:{" "}
      {agentStatus.consoleConnection?.status ?? "unknown"}
    </div>
  );
};

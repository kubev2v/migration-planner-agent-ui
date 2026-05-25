import type React from "react";
import { useAgentStatus } from "./AgentStatusContext";

export const AgentUIVersion: React.FC = () => {
  const { agentStatus, error } = useAgentStatus();

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
      Agent: {agentStatus.mode} - Connection: {agentStatus.console_connection}
    </div>
  );
};

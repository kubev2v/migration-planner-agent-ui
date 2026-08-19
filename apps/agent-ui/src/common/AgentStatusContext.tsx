import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
import { useInjection } from "@openshift-migration-advisor/ioc";
import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import type { DefaultApiInterface } from "../api/agentApi";
import { Symbols } from "../main/Symbols";
import {
  type DiscoverySharingStatus,
  getDiscoverySharingStatus,
} from "./formatDiscoveryStatus";
import { parseApiError } from "./parseApiError";

interface AgentStatusContextValue {
  agentStatus: AgentStatus | null;
  discoverySharingStatus: DiscoverySharingStatus;
  discoverySharingError: string | undefined;
  isDataShared: boolean;
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  enableSharing: () => Promise<void>;
}

const AgentStatusContext = createContext<AgentStatusContextValue | undefined>(
  undefined,
);

export const AgentStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await agentApi.getAgentStatus();
      setAgentStatus(status);
    } catch (err) {
      console.error("Error fetching agent status:", err);
      setError(await parseApiError(err, "Failed to fetch status"));
    }

    setLoading(false);
  }, [agentApi]);

  const enableSharing = useCallback(async () => {
    await agentApi.setAgentMode({ agentModeRequest: { mode: "connected" } });

    const MAX_POLLS = 10;
    const POLL_INTERVAL_MS = 2000;
    for (let i = 0; i < MAX_POLLS; i++) {
      const status = await agentApi.getAgentStatus();
      if (
        status.consoleConnection?.status === "connected" ||
        status.consoleConnection?.error
      ) {
        setAgentStatus(status);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    await fetchStatus();
  }, [agentApi, fetchStatus]);

  const discoverySharingStatus = getDiscoverySharingStatus(agentStatus);

  const value: AgentStatusContextValue = {
    agentStatus,
    discoverySharingStatus,
    discoverySharingError: agentStatus?.consoleConnection.error,
    isDataShared: agentStatus?.mode === "connected",
    loading,
    error,
    fetchStatus,
    enableSharing,
  };

  return (
    <AgentStatusContext.Provider value={value}>
      {children}
    </AgentStatusContext.Provider>
  );
};

export const useAgentStatus = (): AgentStatusContextValue => {
  const context = useContext(AgentStatusContext);
  if (context === undefined) {
    throw new Error("useAgentStatus must be used within AgentStatusProvider");
  }
  return context;
};

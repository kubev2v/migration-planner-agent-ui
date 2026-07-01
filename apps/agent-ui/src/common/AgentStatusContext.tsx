import { useInjection } from "@migration-planner-ui/ioc";
import type {
  AgentStatus,
  CollectorStatus,
  DefaultApiInterface,
} from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Symbols } from "../main/Symbols";

interface AgentStatusContextValue {
  agentStatus: AgentStatus | null;
  collectorStatus: CollectorStatus | null;
  loading: boolean;
  error: string | null;
  hasCollectionData: boolean;
  refetch: () => Promise<void>;
}

const AgentStatusContext = createContext<AgentStatusContextValue | undefined>(
  undefined,
);

export const AgentStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [collectorStatus, setCollectorStatus] =
    useState<CollectorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextAgentStatus, nextCollectorStatus] = await Promise.all([
        agentApi.getAgentStatus(),
        agentApi.getCollectorStatus(),
      ]);
      setAgentStatus(nextAgentStatus);
      setCollectorStatus(nextCollectorStatus);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error fetching agent status:", err);
      setError(`Failed to fetch status: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [agentApi]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const value: AgentStatusContextValue = {
    agentStatus,
    collectorStatus,
    loading,
    error,
    hasCollectionData: collectorStatus?.status === "collected",
    refetch: fetchStatus,
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

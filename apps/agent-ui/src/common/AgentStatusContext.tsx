import { useInjection } from "@migration-planner-ui/ioc";
import type {
  AgentStatus,
  CollectorStatus,
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
import type { DefaultApiInterface } from "./agentApi";
import { getLatestCollectionId } from "./collectionApi";
import { getCollectorStatus } from "./collectorApi";
import { isCollectorInProgress } from "./collectorStatus";

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
  const [hasCollectionData, setHasCollectionData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [agentResult, collectorResult] = await Promise.allSettled([
      agentApi.getAgentStatus(),
      getCollectorStatus(agentApi),
    ]);

    if (agentResult.status === "fulfilled") {
      setAgentStatus(agentResult.value);
    } else {
      const err = agentResult.reason;
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error fetching agent status:", err);
      setError(`Failed to fetch status: ${errorMessage}`);
    }

    if (collectorResult.status === "fulfilled") {
      const nextCollectorStatus = collectorResult.value;
      setCollectorStatus(nextCollectorStatus);

      if (nextCollectorStatus.status === "collected") {
        setHasCollectionData(true);
      } else if (
        isCollectorInProgress(nextCollectorStatus.status) ||
        nextCollectorStatus.status === "error" ||
        nextCollectorStatus.status === "ready"
      ) {
        try {
          const collectionId = await getLatestCollectionId(agentApi);
          if (collectionId) {
            setHasCollectionData(true);
          }
        } catch (collectionErr) {
          console.error(
            "Error checking for existing collections:",
            collectionErr,
          );
        }
      }
    } else {
      console.error("Error fetching collector status:", collectorResult.reason);
      setCollectorStatus(null);
    }

    setLoading(false);
  }, [agentApi]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const value: AgentStatusContextValue = {
    agentStatus,
    collectorStatus,
    loading,
    error,
    hasCollectionData,
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

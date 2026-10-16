import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
import { useCallback } from "react";
import { useGetAgentStatusQuery } from "../store/api/lifecycleEndpoints";
import { getSdkErrorMessage } from "../store/baseQuery";

export interface AgentStatusValue {
  agentStatus: AgentStatus | null;
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
}

/**
 * Agent status backed by RTK Query. All callers share the single
 * `getAgentStatus` cache entry, so the value can no longer diverge between
 * consumers. `agentStatus` is the cached response and `fetchStatus` refetches.
 */
export function useAgentStatus(): AgentStatusValue {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useGetAgentStatusQuery();

  const agentStatus = data ?? null;

  const fetchStatus = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    agentStatus,
    loading: isLoading,
    error: queryError
      ? getSdkErrorMessage(queryError, "Failed to fetch status")
      : null,
    fetchStatus,
  };
}

import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
import { useCallback } from "react";
import {
  useGetAgentStatusQuery,
  useSetAgentModeMutation,
} from "../store/api/lifecycleEndpoints";
import { getSdkErrorMessage } from "../store/baseQuery";
import {
  type DiscoverySharingStatus,
  getDiscoverySharingStatus,
} from "./formatDiscoveryStatus";

export interface AgentStatusValue {
  agentStatus: AgentStatus | null;
  discoverySharingStatus: DiscoverySharingStatus;
  discoverySharingError: string | undefined;
  isDataShared: boolean;
  isRvtoolsMode: boolean;
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  enableSharing: () => Promise<void>;
}

const ENABLE_SHARING_MAX_POLLS = 10;
const ENABLE_SHARING_POLL_INTERVAL_MS = 2000;

/**
 * Agent status backed by RTK Query, replacing the former `AgentStatusContext`.
 * All callers share the single `getAgentStatus` cache entry, so the value can no
 * longer diverge between the masthead, the login page and the app-mode seed.
 *
 * The public shape is preserved so existing consumers keep working: `agentStatus`
 * is the cached response, `fetchStatus` refetches, and `enableSharing` switches
 * the agent to connected mode and polls until the console connection settles.
 */
export function useAgentStatus(): AgentStatusValue {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useGetAgentStatusQuery();
  const [setAgentMode] = useSetAgentModeMutation();

  const agentStatus = data ?? null;

  const fetchStatus = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const enableSharing = useCallback(async () => {
    try {
      await setAgentMode({ mode: "connected" }).unwrap();
    } catch (err) {
      throw new Error(getSdkErrorMessage(err, "Failed to enable data sharing"));
    }

    for (let i = 0; i < ENABLE_SHARING_MAX_POLLS; i++) {
      const status = await refetch().unwrap();
      if (
        status.consoleConnection?.status === "connected" ||
        status.consoleConnection?.error
      ) {
        return;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, ENABLE_SHARING_POLL_INTERVAL_MS);
      });
    }
    await refetch();
  }, [setAgentMode, refetch]);

  return {
    agentStatus,
    discoverySharingStatus: getDiscoverySharingStatus(agentStatus),
    discoverySharingError: agentStatus?.consoleConnection.error,
    isDataShared: agentStatus?.mode === "connected",
    isRvtoolsMode: agentStatus?.rvtoolsModeEnabled === true,
    loading: isLoading,
    error: queryError
      ? getSdkErrorMessage(queryError, "Failed to fetch status")
      : null,
    fetchStatus,
    enableSharing,
  };
}

import type {
  AgentStatus,
  CollectorStatus,
} from "@openshift-migration-advisor/agent-sdk";
import { agentApiSlice } from "./agentApiSlice";

/**
 * Collection lifecycle + agent-status endpoints.
 *
 * These replace the hand-rolled `AgentStatusContext` and the former
 * `ReportsContext` pub/sub bus: agent status and collector status are now cache
 * entries, and the lifecycle mutations invalidate the shared tags so every
 * dependent query refetches together instead of being re-synced by callbacks.
 *
 * `listCollections` already lives in `comparisonEndpoints` (the `Collections`
 * tag), so it is not redefined here — a completed report invalidates that tag
 * via the collection-completion listener (see
 * `store/listeners/vmsInvalidationListeners.ts`) rather than owning a second copy.
 */
export const lifecycleEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    // --- Queries -----------------------------------------------------------
    getAgentStatus: build.query<AgentStatus, void>({
      query: () => (sdk) => sdk.getAgentStatus(),
      providesTags: ["AgentStatus"],
    }),

    getCollectorStatus: build.query<CollectorStatus, void>({
      query: () => (sdk) => sdk.getCollectorStatus(),
      providesTags: ["CollectorStatus"],
    }),

    // --- Mutations ---------------------------------------------------------
    startCollector: build.mutation<CollectorStatus, void>({
      query: () => (sdk) => sdk.startCollector(),
      invalidatesTags: ["CollectorStatus"],
    }),

    startRvtoolsCollector: build.mutation<CollectorStatus, { files: File[] }>({
      query:
        ({ files }) =>
        (sdk) =>
          sdk.startRvtoolsCollector({ files }),
      invalidatesTags: ["CollectorStatus"],
    }),

    stopCollector: build.mutation<void, void>({
      query: () => (sdk) => sdk.stopCollector(),
      invalidatesTags: ["CollectorStatus"],
    }),

    deleteCollectedData: build.mutation<void, void>({
      query: () => (sdk) => sdk.deleteCollections(),
      invalidatesTags: [
        "Collections",
        "Vms",
        "Inventory",
        "VmLabels",
        "CollectorStatus",
      ],
    }),
  }),
});

export const {
  useGetAgentStatusQuery,
  useGetCollectorStatusQuery,
  useStartCollectorMutation,
  useStartRvtoolsCollectorMutation,
  useStopCollectorMutation,
  useDeleteCollectedDataMutation,
} = lifecycleEndpoints;

import type {
  AgentModeRequest,
  AgentStatus,
  CollectorStatus,
  InspectorStatus,
  StartInspectionRequest,
  VddkProperties,
} from "@openshift-migration-advisor/agent-sdk";
import { agentApiSlice } from "./agentApiSlice";

/** Argument for the inspector status read (VDDK metadata is opt-in). */
interface GetInspectorStatusArg {
  includeVddk?: boolean;
}

/**
 * Collection / inspection lifecycle + agent-status endpoints.
 *
 * These replace the hand-rolled `AgentStatusContext` and the former
 * `ReportsContext` pub/sub bus: agent status, collector status and inspector
 * status are now cache entries, and the lifecycle mutations invalidate the shared
 * tags so every dependent query refetches together instead of being re-synced by
 * callbacks.
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

    getInspectorStatus: build.query<
      InspectorStatus,
      GetInspectorStatusArg | undefined
    >({
      query: (arg) => (sdk) =>
        sdk.getInspectorStatus({ includeVddk: arg?.includeVddk }),
      providesTags: ["InspectorStatus"],
    }),

    // --- Mutations ---------------------------------------------------------
    setAgentMode: build.mutation<AgentStatus, AgentModeRequest>({
      query: (agentModeRequest) => (sdk) =>
        sdk.setAgentMode({ agentModeRequest }),
      invalidatesTags: ["AgentStatus"],
    }),

    startCollector: build.mutation<CollectorStatus, void>({
      query: () => (sdk) => sdk.startCollector(),
      invalidatesTags: ["CollectorStatus"],
    }),

    stopCollector: build.mutation<void, void>({
      query: () => (sdk) => sdk.stopCollector(),
      invalidatesTags: ["CollectorStatus"],
    }),

    putInspectorVddk: build.mutation<VddkProperties, { file: Blob }>({
      query:
        ({ file }) =>
        (sdk) =>
          sdk.putInspectorVddk({ file }),
      invalidatesTags: ["InspectorStatus"],
    }),

    startInspection: build.mutation<InspectorStatus, StartInspectionRequest>({
      query: (startInspectionRequest) => (sdk) =>
        sdk.startInspection({ startInspectionRequest }),
      invalidatesTags: ["InspectorStatus"],
    }),

    stopInspection: build.mutation<InspectorStatus, void>({
      query: () => (sdk) => sdk.stopInspection(),
      invalidatesTags: ["InspectorStatus"],
    }),

    cancelVirtualMachineInspection: build.mutation<void, { vmId: string }>({
      query:
        ({ vmId }) =>
        (sdk) =>
          sdk.cancelVirtualMachineInspection({ vmId }),
    }),
  }),
});

export const {
  useGetAgentStatusQuery,
  useGetCollectorStatusQuery,
  useGetInspectorStatusQuery,
  useLazyGetInspectorStatusQuery,
  useSetAgentModeMutation,
  useStartCollectorMutation,
  useStopCollectorMutation,
  usePutInspectorVddkMutation,
  useStartInspectionMutation,
  useStopInspectionMutation,
  useCancelVirtualMachineInspectionMutation,
} = lifecycleEndpoints;

import type {
  BatchUpdateExclusionRequest,
  DeleteLabelGloballyResponse,
  RightsizingClusterUtilization,
  UpdateLabelVMsRequest,
  VirtualMachineDetail,
  VirtualMachineListResponse,
  VirtualMachineUpdateRequest,
  VMLabelsResponse,
  VmUtilizationDetails,
} from "@openshift-migration-advisor/agent-sdk";
import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { getLatestCollectionId } from "../../api/collectionApi";
import type { ApplicationOverview } from "../../pages/VirtualMachinesOverview/components/ApplicationsTab/applicationsApi";
import { scopeApplicationsToVms } from "../../pages/VirtualMachinesOverview/components/ApplicationsTab/applicationsApi";
import { fetchVmTableFilterOptions } from "../../pages/VirtualMachinesOverview/components/VirtualMachinesTab/vmFilterOptions";
import { fetchAllMatchingVmIds } from "../../pages/VirtualMachinesOverview/components/VirtualMachinesTab/vmSelection";
import type { VMTableFilterOptions } from "../../pages/VirtualMachinesOverview/components/VirtualMachinesTab/vmTableTypes";
import {
  adjustInventoryForMigrationExcludedChange,
  fetchInventoryFromApi,
  type InventoryPayload,
  type MigrationExcludedInventoryChange,
} from "../../pages/VirtualMachinesOverview/inventoryParsing";
import { agentApiSlice } from "./agentApiSlice";

interface GetVMsArg {
  byExpression?: string;
  sort?: string[];
  page: number;
  pageSize: number;
}

interface GetApplicationsArg {
  /** Restrict applications to VMs matching this filter (e.g. group membership). */
  scopeExpression?: string;
}

/** A single VM's detail record with its (optional) rightsizing utilization. */
export interface VirtualMachineDetailWithUtilization
  extends VirtualMachineDetail {
  utilization?: VmUtilizationDetails;
}

interface SetVMExclusionArg {
  vmIds: string[];
  migrationExcluded: boolean;
  /** Pre-change VM records, used to optimistically adjust inventory counts. */
  affectedVms: MigrationExcludedInventoryChange["affectedVms"];
  /** When set, the change happened inside a group detail page; also refetch it. */
  groupId?: string;
}

interface UpdateVirtualMachineArg {
  vmId: string;
  virtualMachineUpdateRequest: VirtualMachineUpdateRequest;
  groupId?: string;
}

interface UpdateVMLabelsArg {
  label: string;
  add?: string[];
  remove?: string[];
  groupId?: string;
}

interface DeleteLabelGloballyArg {
  label: string;
  groupId?: string;
}

/**
 * Tags refetched when a VM mutation happens inside a group detail page, so an
 * open GroupDetailPage (header count + VM table + assessment inventory) stays in
 * sync alongside the global VM list.
 */
function groupInvalidationTags(groupId?: string) {
  if (!groupId) {
    return [] as const;
  }
  return [
    { type: "Group", id: groupId },
    { type: "GroupVms", id: groupId },
    { type: "GroupInventory", id: groupId },
  ] as const;
}

/**
 * VM overview endpoints. The VM table (`getVMs`), the assessment inventory
 * (`getInventory`), the filter dropdowns (`getVMFilterOptions`), the label set
 * (`getVMLabels`) and the applications list (`getApplications`) are separate
 * cache entries invalidated by the same tags, so an exclusion or label change
 * refetches every dependent value together — counts cannot diverge.
 */
export const vmsEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    // Table source: paginated VM list for the current filter/sort/page.
    getVMs: build.query<VirtualMachineListResponse, GetVMsArg>({
      query:
        ({ byExpression, sort, page, pageSize }) =>
        (sdk) =>
          sdk.listLatestVirtualMachines({
            byExpression,
            sort: sort && sort.length > 0 ? sort : undefined,
            page,
            pageSize,
          }),
      providesTags: (result) => [
        { type: "Vms", id: "LIST" },
        ...(result?.virtualMachines ?? []).map((vm) => ({
          type: "Vms" as const,
          id: vm.id,
        })),
      ],
    }),

    // Header/dashboard source: the whole-fleet inventory (via raw fetch to work
    // around an SDK response-parsing bug — see fetchInventoryFromApi).
    getInventory: build.query<InventoryPayload | null, void>({
      query: () => (sdk) => fetchInventoryFromApi(getAgentApiBasePath(sdk)),
      providesTags: ["Inventory"],
    }),

    // Filter dropdown values (clusters, datacenters, labels, groups, …). Only
    // label and group changes alter these option lists, so it does NOT share
    // `Vms:LIST` — that keeps inspection polling from refetching it every tick.
    getVMFilterOptions: build.query<VMTableFilterOptions, void>({
      query: () => (sdk) => fetchVmTableFilterOptions(sdk),
      providesTags: ["VmLabels", { type: "Group", id: "LIST" }],
    }),

    getVMLabels: build.query<string[], void>({
      query: () => async (sdk) => {
        const response: VMLabelsResponse = await sdk.getLatestVMLabels();
        return response.labels ?? [];
      },
      providesTags: ["VmLabels"],
    }),

    // Single VM detail (general/compute/network/storage/issues) plus its
    // rightsizing utilization. Utilization is optional: a VM detail still
    // renders when the metrics endpoint has no data, so it is fetched
    // best-effort and swallowed on failure.
    getVMDetail: build.query<VirtualMachineDetailWithUtilization, string>({
      query: (vmId) => async (sdk) => {
        const vmData = await sdk.getLatestVirtualMachine({ vmId });
        let utilization: VmUtilizationDetails | undefined;
        try {
          utilization = await sdk.getLatestVMUtilization({ vmId });
        } catch (err) {
          console.warn("Error fetching VM utilization:", err);
        }
        return { ...vmData, utilization };
      },
      providesTags: (_result, _error, vmId) => [{ type: "Vms", id: vmId }],
    }),

    // Per-cluster usage statistics for the latest collection. Keyed by
    // clusterId; consumers skip the query when no specific cluster is selected.
    getClusterUtilization: build.query<
      RightsizingClusterUtilization | null,
      string
    >({
      query: (clusterId) => async (sdk) => {
        const collectionId = await getLatestCollectionId(sdk);
        if (!collectionId) {
          return null;
        }
        const response = await sdk.getClusterUtilization({
          id: collectionId,
          clusterId,
        });
        return response.cluster;
      },
      providesTags: ["Inventory"],
    }),

    // Applications detected in the latest collection, optionally scoped to a
    // VM filter (group membership). Scoping resolves the matching VM ids first.
    // Group membership changes re-scope the list, so it shares `Group:LIST`.
    getApplications: build.query<ApplicationOverview[], GetApplicationsArg>({
      query:
        ({ scopeExpression }) =>
        async (sdk) => {
          const collectionId = await getLatestCollectionId(sdk);
          if (!collectionId) {
            return [];
          }
          const response = await sdk.listApplications({ id: collectionId });
          const applications = response.applications ?? [];
          if (!scopeExpression) {
            return applications;
          }
          const vmIds = await fetchAllMatchingVmIds(sdk, {
            byExpression: scopeExpression,
          });
          return scopeApplicationsToVms(applications, new Set(vmIds));
        },
      providesTags: [{ type: "Group", id: "LIST" }],
    }),

    // Bulk exclude/include from reports. Invalidates the VM list and inventory
    // (plus the group's tags when scoped) so table and counts refetch together.
    setVMExclusion: build.mutation<void, SetVMExclusionArg>({
      query:
        ({ vmIds, migrationExcluded }) =>
        async (sdk) => {
          await sdk.batchUpdateLatestVMExclusion({
            batchUpdateExclusionRequest: {
              vmIds,
              migrationExcluded,
            } satisfies BatchUpdateExclusionRequest,
          });
        },
      // Optimistically adjust the fleet inventory totals so the assessment
      // report reflects the change instantly; the invalidation below then
      // refetches the authoritative value. Group-scoped inventory comes from
      // getGroup, so it is refreshed by tag invalidation only.
      onQueryStarted: async (
        { vmIds, migrationExcluded, affectedVms, groupId },
        { dispatch, queryFulfilled },
      ) => {
        if (groupId) {
          return;
        }
        const patch = dispatch(
          vmsEndpoints.util.updateQueryData(
            "getInventory",
            undefined,
            (draft) => {
              if (!draft) {
                return draft;
              }
              return adjustInventoryForMigrationExcludedChange(
                draft,
                vmIds,
                migrationExcluded,
                affectedVms,
              );
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Vms", id: "LIST" },
        "Inventory",
        ...groupInvalidationTags(groupId),
      ],
    }),

    // Single-VM update (e.g. exclusion toggle for one row).
    updateVirtualMachine: build.mutation<void, UpdateVirtualMachineArg>({
      query:
        ({ vmId, virtualMachineUpdateRequest }) =>
        async (sdk) => {
          await sdk.updateLatestVirtualMachine({
            vmId,
            virtualMachineUpdateRequest,
          });
        },
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Vms", id: "LIST" },
        "Inventory",
        ...groupInvalidationTags(groupId),
      ],
    }),

    // Add/remove a label on a set of VMs.
    updateVMLabels: build.mutation<void, UpdateVMLabelsArg>({
      query:
        ({ label, add, remove }) =>
        async (sdk) => {
          await sdk.updateLatestLabelVMs({
            label,
            updateLabelVMsRequest: {
              add,
              remove,
            } satisfies UpdateLabelVMsRequest,
          });
        },
      invalidatesTags: (_result, _error, { groupId }) => [
        "VmLabels",
        { type: "Vms", id: "LIST" },
        ...groupInvalidationTags(groupId),
      ],
    }),

    // Delete a label everywhere it is applied.
    deleteLabelGlobally: build.mutation<
      DeleteLabelGloballyResponse,
      DeleteLabelGloballyArg
    >({
      query:
        ({ label }) =>
        (sdk) =>
          sdk.deleteLatestLabelGlobally({ label }),
      invalidatesTags: (_result, _error, { groupId }) => [
        "VmLabels",
        { type: "Vms", id: "LIST" },
        ...groupInvalidationTags(groupId),
      ],
    }),
  }),
});

export const {
  useGetVMsQuery,
  useGetInventoryQuery,
  useGetVMFilterOptionsQuery,
  useGetVMLabelsQuery,
  useGetVMDetailQuery,
  useGetClusterUtilizationQuery,
  useGetApplicationsQuery,
  useSetVMExclusionMutation,
  useUpdateVirtualMachineMutation,
  useUpdateVMLabelsMutation,
  useDeleteLabelGloballyMutation,
} = vmsEndpoints;

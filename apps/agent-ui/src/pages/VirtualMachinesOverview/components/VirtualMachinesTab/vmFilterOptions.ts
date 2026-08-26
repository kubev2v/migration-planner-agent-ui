import type { Group } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { fetchAllGroupsPages } from "../../../Groups/utils/groupList";
import type { VMTableFilterOptions } from "./vmTableTypes";

const EMPTY_VM_TABLE_FILTER_OPTIONS: VMTableFilterOptions = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  groups: [],
  applications: [],
};

/**
 * Merges group names from live VM membership into filter options.
 * Complements `fetchVmTableFilterOptions` when membership is already loaded
 * or when the groups list API call failed but row data still carries group names.
 */
export function mergeGroupNamesIntoFilterOptions(
  options: VMTableFilterOptions | undefined,
  groupNames: string[],
): VMTableFilterOptions {
  const base = options ?? EMPTY_VM_TABLE_FILTER_OPTIONS;
  const allGroups = new Set([...base.groups, ...groupNames.filter(Boolean)]);
  return {
    ...base,
    groups: [...allGroups].sort((a, b) => a.localeCompare(b)),
  };
}

/** Loads distinct VM filter option values for the VMs table filter UI. */
export async function fetchVmTableFilterOptions(
  agentApi: DefaultApiInterface,
): Promise<VMTableFilterOptions> {
  const [response, labelsResponse, groups] = await Promise.all([
    agentApi.getLatestVMFilterOptions(),
    agentApi.getLatestVMLabels().catch(() => ({ labels: [] as string[] })),
    fetchAllGroupsPages(agentApi).catch((err) => {
      console.error("Error fetching groups for filter options:", err);
      return [] as Group[];
    }),
  ]);

  const groupNames = groups
    .map((group) => group.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    clusters: response.clusters || [],
    datacenters: response.datacenters || [],
    concernLabels: response.concernLabels || [],
    concernCategories: response.concernCategories || [],
    vmLabels: labelsResponse.labels || [],
    groups: groupNames,
    applications: response.applications || [],
  };
}

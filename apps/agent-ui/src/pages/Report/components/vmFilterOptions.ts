import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import { fetchAllGroups } from "./groupList";
import type { VMTableFilterOptions } from "./vmTableTypes";

const EMPTY_VM_TABLE_FILTER_OPTIONS: VMTableFilterOptions = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  groups: [],
};

export const FILTER_OPTIONS_REFRESH_TTL_MS = 60_000;

export type RefreshFilterOptionsFn = (options?: {
  force?: boolean;
}) => void | Promise<void>;

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
    agentApi.getVMsFilterOptions(),
    agentApi.getVMLabels().catch(() => ({ labels: [] as string[] })),
    fetchAllGroups(agentApi).catch((err) => {
      console.error("Error fetching groups for filter options:", err);
      return [];
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
  };
}

/** Returns a throttled refresh callback; pass `{ force: true }` after group mutations. */
export function createRefreshVmTableFilterOptions(
  agentApi: DefaultApiInterface,
  setOptions: (options: VMTableFilterOptions) => void,
): RefreshFilterOptionsFn {
  let lastRefreshAt = 0;

  return async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && now - lastRefreshAt < FILTER_OPTIONS_REFRESH_TTL_MS) {
      return;
    }

    try {
      setOptions(await fetchVmTableFilterOptions(agentApi));
      lastRefreshAt = now;
    } catch (err) {
      console.error("Error refreshing filter options:", err);
    }
  };
}

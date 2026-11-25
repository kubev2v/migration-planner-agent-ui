import {
  type Group,
  VMFilterOptionsResponseFromJSON,
} from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { fetchAllGroupsPages } from "../../../Groups/utils/groupList";
import {
  listVmMetadataFilterOptions,
  normalizeVmMetadata,
} from "../../virtualMachineParsing";
import type { VMTableFilterOptions } from "./vmTableTypes";

const EMPTY_VM_TABLE_FILTER_OPTIONS: VMTableFilterOptions = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  vsphereTags: [],
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

/** Map filter-options JSON into table filter dropdown values (keeps vSphere metadata). */
export function parseVmTableFilterOptionsFromJson(
  json: unknown,
  vmLabels: string[],
  groups: string[],
): VMTableFilterOptions {
  const response = VMFilterOptionsResponseFromJSON(json);
  const record =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const metadata =
    normalizeVmMetadata(record.metadata) ??
    normalizeVmMetadata(response.metadata);

  return {
    clusters: response.clusters || [],
    datacenters: response.datacenters || [],
    concernLabels: response.concernLabels || [],
    concernCategories: response.concernCategories || [],
    vmLabels,
    vsphereTags: listVmMetadataFilterOptions(metadata),
    groups,
    applications: response.applications || [],
  };
}

/** Loads distinct VM filter option values for the VMs table filter UI. */
export async function fetchVmTableFilterOptions(
  agentApi: DefaultApiInterface,
): Promise<VMTableFilterOptions> {
  const [filterOptionsResponse, labelsResponse, groups] = await Promise.all([
    agentApi.getLatestVMFilterOptionsRaw(),
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

  const json = await filterOptionsResponse.raw.json();
  return parseVmTableFilterOptionsFromJson(
    json,
    labelsResponse.labels || [],
    groupNames,
  );
}

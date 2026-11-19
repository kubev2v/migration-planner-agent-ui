import { VMFilterOptionsResponseFromJSON } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import {
  listVmMetadataFilterOptions,
  normalizeVmMetadata,
} from "../../virtualMachineParsing";
import type { VMTableFilterOptions } from "./vmTableTypes";

/** Map filter-options JSON into table filter dropdown values (keeps vSphere metadata). */
export function parseVmTableFilterOptionsFromJson(
  json: unknown,
  vmLabels: string[],
): VMTableFilterOptions {
  const response = VMFilterOptionsResponseFromJSON(json);
  const record =
    json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : {};
  const metadata = normalizeVmMetadata(record.metadata);

  return {
    clusters: response.clusters || [],
    datacenters: response.datacenters || [],
    concernLabels: response.concernLabels || [],
    concernCategories: response.concernCategories || [],
    vmLabels,
    vsphereTags: listVmMetadataFilterOptions(metadata),
  };
}

/** Loads distinct VM filter option values for the VMs table filter UI. */
export async function fetchVmTableFilterOptions(
  agentApi: DefaultApiInterface,
): Promise<VMTableFilterOptions> {
  const [filterOptionsResponse, labelsResponse] = await Promise.all([
    agentApi.getLatestVMFilterOptionsRaw(),
    agentApi.getLatestVMLabels().catch(() => ({ labels: [] as string[] })),
  ]);
  const json = await filterOptionsResponse.raw.json();
  return parseVmTableFilterOptionsFromJson(json, labelsResponse.labels || []);
}

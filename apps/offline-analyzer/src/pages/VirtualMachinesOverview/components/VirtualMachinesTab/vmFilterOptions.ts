import type { DefaultApiInterface } from "../../../../api/agentApi";
import type { VMTableFilterOptions } from "./vmTableTypes";

/** Loads distinct VM filter option values for the VMs table filter UI. */
export async function fetchVmTableFilterOptions(
  agentApi: DefaultApiInterface,
): Promise<VMTableFilterOptions> {
  const [response, labelsResponse] = await Promise.all([
    agentApi.getLatestVMFilterOptions(),
    agentApi.getLatestVMLabels().catch(() => ({ labels: [] as string[] })),
  ]);

  return {
    clusters: response.clusters || [],
    datacenters: response.datacenters || [],
    concernLabels: response.concernLabels || [],
    concernCategories: response.concernCategories || [],
    vmLabels: labelsResponse.labels || [],
  };
}

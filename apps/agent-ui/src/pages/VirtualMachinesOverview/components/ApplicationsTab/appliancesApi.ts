import type { AgentApiClient } from "../../../../api/agentApi";
import { getAgentApiBasePath } from "../../../../api/agentApiConfig";

export interface ApplianceVm {
  id: string;
  name: string;
}

export interface ApplianceOverview {
  name: string;
  vendor: string;
  version: string;
  confidence: number;
  vmCount: number;
  vms: ApplianceVm[];
}

export interface ApplianceListResponse {
  appliances: ApplianceOverview[];
}

async function parseApplianceListResponse(
  response: Response,
): Promise<ApplianceOverview[]> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = (await response.json()) as ApplianceListResponse;
  return data.appliances ?? [];
}

/** List appliances detected in a collection (`GET /collections/{id}/appliances`). */
export async function listCollectionAppliances(
  agentApi: AgentApiClient,
  collectionId: string,
): Promise<ApplianceOverview[]> {
  const basePath = getAgentApiBasePath(agentApi);
  const url = `${basePath}/collections/${encodeURIComponent(collectionId)}/appliances`;
  const response = await fetch(url, { cache: "no-store" });
  return parseApplianceListResponse(response);
}

/** List appliances on a group's VMs (`GET /groups/{groupId}/appliances`). */
export async function listGroupAppliances(
  agentApi: AgentApiClient,
  groupId: string,
): Promise<ApplianceOverview[]> {
  const basePath = getAgentApiBasePath(agentApi);
  const url = `${basePath}/groups/${encodeURIComponent(groupId)}/appliances`;
  const response = await fetch(url, { cache: "no-store" });
  return parseApplianceListResponse(response);
}

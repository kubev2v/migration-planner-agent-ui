import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "./agentApi";

/** Fetch the singleton collector status (v2 `/collector`). */
export async function getCollectorStatus(
  agentApi: DefaultApiInterface,
  initOverrides?: RequestInit,
): Promise<CollectorStatus> {
  return agentApi.getCollectorStatus(initOverrides);
}

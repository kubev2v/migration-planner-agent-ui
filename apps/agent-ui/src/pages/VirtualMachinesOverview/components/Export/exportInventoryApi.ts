import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import { getAgentApiBasePath } from "../../agentApiConfig";
import { type ExportScopeId, scopesToExportParam } from "./exportScopes";

export async function fetchExportInventory(
  agentApi: DefaultApiInterface,
  scopes: ExportScopeId[],
): Promise<Blob> {
  const basePath = getAgentApiBasePath(agentApi);
  const scope = scopesToExportParam(scopes);
  const url = new URL(`${basePath}/export`, window.location.origin);
  if (scope) {
    url.searchParams.set("scope", scope);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    let message = `Export failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    } catch {
      // Response body is not JSON.
    }
    throw new Error(message);
  }

  return response.blob();
}

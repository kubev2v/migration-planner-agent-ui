import { Configuration } from "@openshift-migration-advisor/agent-sdk";
import { type AgentApiClient, createAgentApi } from "./agentApi";

/**
 * Single source of the SDK client.
 *
 * The IoC container (`packages/ioc`) is gone: the store's thunk `extraArgument`
 * is the primary consumer of this client (every RTK Query endpoint reaches it
 * via its baseQuery). The few imperative one-off SDK calls that are not modeled
 * as endpoints — exports, blob downloads, credential validation, the
 * `ProtectedRoute` auth probe, the collector lifecycle and the paged group
 * enrichment loops — call `getAgentApiClient()` directly, so there is still
 * exactly one client instance shared across the whole app.
 */

export const getConfigurationBasePath = (): string => {
  if (import.meta.env.PROD) {
    // In production, use HTTPS
    const origin = window.location.origin.replace(/^http:/, "https:");
    return `${origin}/api/v2`;
  }

  // In development, use the current origin (allows HTTP for local dev)
  return `${window.location.origin}/agent/api/v2`;
};

let client: AgentApiClient | undefined;

/** Lazily build (once) and return the shared SDK client. */
export function getAgentApiClient(): AgentApiClient {
  if (!client) {
    const configuration = new Configuration({
      basePath: getConfigurationBasePath(),
      fetchApi: (url, init) => fetch(url, { ...init, cache: "no-store" }),
    });
    client = createAgentApi(configuration);
  }
  return client;
}

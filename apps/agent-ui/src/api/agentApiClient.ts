import { Configuration } from "@openshift-migration-advisor/agent-sdk";
import { type AgentApiClient, createAgentApi } from "./agentApi";

/**
 * The SDK client is a **module singleton** — one instance shared across the
 * whole app, reached by two access paths:
 *
 *   1. The store's thunk `extraArgument` (built once in `Root.tsx` via
 *      `createStore(getAgentApiClient())`). Every RTK Query endpoint reaches the
 *      client through its baseQuery — this is the primary path.
 *   2. ~8 direct `getAgentApiClient()` imports for imperative one-offs that are
 *      not modeled as endpoints: inventory/blob exports (`DiscoveryStatus`,
 *      `VirtualMachinesOverviewPage`), the `ProtectedRoute` auth probe, the
 *      storage-forecaster base path, the paged group loops (`CreateGroupModal`,
 *      `RemoveFromGroupModal`, `GroupDetailPage`), and the credential/collector
 *      lifecycle (`UseCredentialViewModel`).
 *
 * This is *not* "the store is the single source": the store is one consumer of
 * the singleton, not its owner. agent-ui no longer uses the IoC container
 * (`packages/ioc`, `useInjection`, `Symbols.AgentApi`) — it lazily builds this
 * singleton instead.
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

import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";

/** Workaround: access SDK configuration.basePath (not exposed on DefaultApiInterface). */
export type ApiWithConfig = DefaultApiInterface & {
  configuration?: { basePath?: string };
};

export function getAgentApiBasePath(agentApi?: DefaultApiInterface): string {
  return (
    (agentApi as ApiWithConfig | undefined)?.configuration?.basePath ||
    `${window.location.origin}/agent/api/v1`
  );
}

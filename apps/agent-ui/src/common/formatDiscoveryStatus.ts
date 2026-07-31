import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";

export function formatDiscoveryStatus(
  agentStatus: AgentStatus | null | undefined,
): string {
  const status = agentStatus?.consoleConnection?.status;
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";

export function formatDiscoveryStatus(
  agentStatus: AgentStatus | null | undefined,
): string {
  const connection = agentStatus?.console_connection;
  if (!connection) {
    return "Unknown";
  }

  return connection.charAt(0).toUpperCase() + connection.slice(1);
}

import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";

export type DiscoverySharingStatus = "Sharing" | "Not shared" | "Sharing error";

export function getDiscoverySharingStatus(
  agentStatus: AgentStatus | null | undefined,
): DiscoverySharingStatus {
  if (agentStatus?.consoleConnection?.error) {
    return "Sharing error";
  }

  if (agentStatus?.consoleConnection?.status === "connected") {
    return "Sharing";
  }

  return "Not shared";
}

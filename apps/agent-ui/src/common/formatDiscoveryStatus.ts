import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";

export type DiscoverySharingStatus = {
  label: "Sharing" | "Not sharing" | "Sharing error";
  error?: string;
};

export function getDiscoverySharingStatus(
  agentStatus: AgentStatus | null | undefined,
): DiscoverySharingStatus {
  if (agentStatus?.error) {
    return { label: "Sharing error", error: agentStatus.error };
  }

  if (agentStatus?.console_connection === "connected") {
    return { label: "Sharing" };
  }

  return { label: "Not sharing" };
}

export function formatDiscoveryStatus(
  agentStatus: AgentStatus | null | undefined,
): string {
  return getDiscoverySharingStatus(agentStatus).label;
}

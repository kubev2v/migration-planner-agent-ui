import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";

export type DiscoverySharingStatus = {
  label: "Sharing" | "Not sharing" | "Sharing error";
  error?: string;
};

export function getDiscoverySharingStatus(
  agentStatus: AgentStatus | null | undefined,
): DiscoverySharingStatus {
  if (agentStatus?.consoleConnection?.error) {
    return {
      label: "Sharing error",
      error: agentStatus.consoleConnection.error,
    };
  }

  if (agentStatus?.consoleConnection?.status === "connected") {
    return { label: "Sharing" };
  }

  return { label: "Not sharing" };
}

import type { CollectorStatusStatusEnum } from "@openshift-migration-advisor/agent-sdk";

const COLLECTOR_IN_PROGRESS_STATUSES = new Set<string>([
  "connecting",
  "collecting",
  "collecting metrics",
  "parsing",
]);

export function isCollectorInProgress(
  status: CollectorStatusStatusEnum | string | null | undefined,
): boolean {
  return status != null && COLLECTOR_IN_PROGRESS_STATUSES.has(status);
}

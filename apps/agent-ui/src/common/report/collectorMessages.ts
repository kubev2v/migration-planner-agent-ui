import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";

/** Poll cadence for the collector status while a report run is in progress. */
export const COLLECTOR_POLL_INTERVAL_MS = 2_000;

/** Consecutive poll failures tolerated before surfacing a "lost contact" error. */
export const MAX_COLLECTOR_POLL_FAILURES = 5;

/** How long to wait for a newer collection to appear after the collector reports "collected". */
export const COLLECTION_WAIT_TIMEOUT_MS = 90_000;

/** Interval between "is there a newer collection yet?" checks. */
export const COLLECTION_WAIT_INTERVAL_MS = 1_000;

/**
 * Human-readable message for a collector run that finished in a terminal state
 * other than `collected` or `error` (which carry their own messages).
 */
export function unexpectedCollectorStatusMessage(
  status: CollectorStatus["status"],
): string {
  if (status === "ready") {
    return "The new report was cancelled or interrupted.";
  }
  return `The new report stopped unexpectedly (${status}). Please try again.`;
}

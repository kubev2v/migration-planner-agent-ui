import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";

export type CollectionProgressInfo = {
  percentage: number;
  statusText: string;
};

/** Maps collector status to the same progress copy used on first-time login. */
export function getCollectionProgressInfo(
  status: CollectorStatus["status"] | null | undefined,
  errorMessage?: string | null,
): CollectionProgressInfo {
  switch (status) {
    case "connecting":
      return { percentage: 20, statusText: "Connecting to vCenter..." };
    case "collecting":
    case "collecting metrics":
      return { percentage: 60, statusText: "Collecting inventory data..." };
    case "parsing":
      return { percentage: 90, statusText: "Parsing..." };
    case "collected":
      return { percentage: 100, statusText: "Collection complete" };
    case "error":
      return {
        percentage: 0,
        statusText: errorMessage
          ? `Error: ${errorMessage}`
          : "Collection failed",
      };
    default:
      return { percentage: 0, statusText: "" };
  }
}

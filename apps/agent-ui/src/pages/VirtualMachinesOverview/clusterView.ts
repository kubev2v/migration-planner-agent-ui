import type {
  Infra,
  InventoryData,
  VMResourceBreakdown,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import { inventoryClusterName } from "./inventoryParsing";

export type ClusterSelection = string;

export type ClusterOption = { id: string; label: string };

export type ClusterViewModel = {
  viewInfra?: Infra;
  viewVms?: VMs;
  viewClusters?: { [key: string]: InventoryData };
  cpuCores?: VMResourceBreakdown;
  ramGB?: VMResourceBreakdown;
  isAggregateView: boolean;
  selectionId: ClusterSelection;
  selectionLabel: string;
  clusterOptions: ClusterOption[];
  clusterFound: boolean;
};

export const getClusterOptions = (clusters?: {
  [key: string]: InventoryData;
}): ClusterOption[] => {
  const keys = clusters ? Object.keys(clusters) : [];
  const sorted = keys.sort((a, b) => {
    const countA = clusters?.[a]?.vms?.total ?? 0;
    const countB = clusters?.[b]?.vms?.total ?? 0;
    return countB - countA;
  });
  return [
    { id: "all", label: "All vSphere clusters" },
    ...sorted.map((key) => ({
      id: key,
      label: inventoryClusterName(clusters?.[key]) ?? key,
    })),
  ];
};

/**
 * Build a view model for the selected cluster.
 *
 * - When "all" is selected, return aggregate data.
 * - When a cluster is selected but data is missing, return an empty view (no infra/vms)
 *   so the UI can show a non-blocking empty state instead of falling back to aggregates.
 * - If the selected cluster no longer exists in the map, fall back to "all".
 */
export const buildClusterViewModel = ({
  infra,
  vms,
  clusters,
  selectedClusterId = "all",
}: {
  infra?: Infra;
  vms?: VMs;
  clusters?: { [key: string]: InventoryData };
  selectedClusterId?: ClusterSelection;
}): ClusterViewModel => {
  const options = getClusterOptions(clusters);
  const clusterExists =
    selectedClusterId === "all"
      ? true
      : Boolean(clusters && selectedClusterId in clusters);
  const effectiveSelection =
    selectedClusterId === "all" || clusterExists ? selectedClusterId : "all";

  if (effectiveSelection === "all") {
    return {
      viewInfra: infra,
      viewVms: vms,
      cpuCores: vms?.cpuCores,
      ramGB: vms?.ramGB,
      viewClusters: clusters,
      isAggregateView: true,
      selectionId: "all",
      selectionLabel: "All vSphere clusters",
      clusterOptions: options,
      clusterFound: true,
    };
  }

  const clusterData = clusters ? clusters[effectiveSelection] : undefined;
  const clusterInfra = clusterData?.infra;
  const clusterVms = clusterData?.vms;
  const selectionLabel = clusterData
    ? (inventoryClusterName(clusterData) ?? effectiveSelection)
    : "Missing cluster";

  return {
    viewInfra: clusterInfra,
    viewVms: clusterVms,
    cpuCores: clusterVms?.cpuCores,
    ramGB: clusterVms?.ramGB,
    viewClusters: clusterData
      ? { [effectiveSelection]: clusterData }
      : undefined,
    isAggregateView: false,
    selectionId: effectiveSelection,
    selectionLabel,
    clusterOptions: options,
    clusterFound: Boolean(clusterData),
  };
};

/** Header totals for the current cluster dropdown selection. */
export function getClusterScopedHeaderCounts(clusterView: ClusterViewModel): {
  totalVMs: number;
  totalClusters: number;
} {
  return {
    totalVMs: clusterView.viewVms?.total ?? 0,
    totalClusters: clusterView.isAggregateView
      ? Object.keys(clusterView.viewClusters ?? {}).length
      : clusterView.clusterFound
        ? 1
        : 0,
  };
}

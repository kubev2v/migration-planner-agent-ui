/**
 * Cluster rightsizing metrics from the agent API.
 * This type is not yet available in the SDK, so we define it manually
 * based on the API response from GET /api/v1/cluster_rightsizing
 */
export interface ClusterUtilizationMetrics {
  cluster_id: string;
  confidence: number;
  cpu_avg: number;
  cpu_max: number;
  cpu_p95: number;
  disk: number;
  mem_avg: number;
  mem_max: number;
  mem_p95: number;
  total_provisioned_cpus: number;
  total_provisioned_disk_kb: number;
  total_provisioned_memory_mb: number;
  vm_count: number;
}

export interface ClusterRightsizingResponse {
  clusters: ClusterUtilizationMetrics[];
  report_id: string;
}

/**
 * Fetches cluster rightsizing metrics from the agent API.
 * Returns cluster utilization based on the latest metrics report.
 *
 * @param basePath - The base path for the agent API (e.g., "/agent/api/v1")
 * @returns Cluster rightsizing response with clusters array and report ID
 */
export async function fetchClusterRightsizing(
  basePath: string,
): Promise<ClusterRightsizingResponse> {
  const response = await fetch(`${basePath}/cluster_rightsizing`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch cluster rightsizing: ${response.status} ${response.statusText}`,
    );
  }

  const data: ClusterRightsizingResponse = await response.json();

  if (!data.clusters || !Array.isArray(data.clusters)) {
    throw new Error(
      "Invalid response from cluster_rightsizing API: missing clusters array",
    );
  }

  return data;
}

/**
 * Finds cluster utilization metrics for a specific cluster ID.
 *
 * @param response - Cluster rightsizing response
 * @param clusterId - The cluster ID to find (use "all" to skip filtering)
 * @returns The utilization metrics for the cluster (cpu_avg, disk, mem_avg), or undefined if not found or clusterId is "all"
 */
export function getClusterUtilization(
  response: ClusterRightsizingResponse,
  clusterId: string,
): { cpu?: number; disk?: number; mem?: number } | undefined {
  if (clusterId === "all") {
    // Don't show metrics for "all clusters" aggregate view
    return undefined;
  }

  const clusterMetrics = response.clusters.find(
    (cluster) => cluster.cluster_id === clusterId,
  );

  if (!clusterMetrics) {
    return undefined;
  }

  return {
    cpu: clusterMetrics.cpu_avg,
    disk: clusterMetrics.disk,
    mem: clusterMetrics.mem_avg,
  };
}

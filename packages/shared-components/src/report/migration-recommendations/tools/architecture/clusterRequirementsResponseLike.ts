export interface ClusterSizingLike {
  totalNodes: number;
  workerNodes: number;
  controlPlaneNodes: number;
  failoverNodes: number;
  totalCPU: number;
  totalMemory: number;
  cpuUtilizationMax?: number;
  memoryUtilizationMax?: number;
  confidence?: number;
}

export interface InventoryTotalsLike {
  totalVMs: number;
  totalCPU: number;
  totalMemory: number;
}

export interface SavingsLike {
  percentageReduction: number;
  nodesSaved: number;
  description?: string;
}

export interface ResourceConsumptionLike {
  overCommitRatio?: { cpu?: number; memory?: number };
  limits?: { cpu?: number; memory?: number };
}

export interface OptimizationStatusLike {
  reason?: string;
}

export interface ClusterRequirementsResponseLike {
  clusterSizing: ClusterSizingLike;
  optimizedSizing?: ClusterSizingLike;
  savings?: SavingsLike;
  inventoryTotals: InventoryTotalsLike;
  resourceConsumption: ResourceConsumptionLike;
  optimizationStatus?: OptimizationStatusLike;
}

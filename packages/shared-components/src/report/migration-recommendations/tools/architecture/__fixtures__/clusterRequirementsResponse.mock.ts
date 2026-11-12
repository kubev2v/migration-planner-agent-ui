/**
 * Mock data for ClusterRequirementsResponse payload
 *
 * API Endpoint: POST /api/v1/assessments/{id}/cluster-requirements
 * @see PR #819 - ECOPROJECT-3719 | feat: add post endpoint for sizing calculations
 */
import type {
  ClusterRequirementsResponseLike,
  ClusterSizingLike,
  InventoryTotalsLike,
  ResourceConsumptionLike,
} from "../clusterRequirementsResponseLike.js";

/**
 * Default mock response representing a typical medium-sized cluster
 */
export const mockClusterRequirementsResponse = {
  clusterSizing: {
    totalNodes: 8,
    workerNodes: 5,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 128,
    totalMemory: 512,
  },
  resourceConsumption: {
    cpu: 85.5,
    memory: 72.3,
    limits: {
      cpu: 100.0,
      memory: 90.0,
    },
    overCommitRatio: {
      cpu: 4.0,
      memory: 1.0,
    },
  },
  inventoryTotals: {
    totalVMs: 50,
    totalCPU: 200,
    totalMemory: 400,
  },
} as ClusterRequirementsResponseLike;

/**
 * Mock response for a small development cluster
 */
export const mockSmallClusterResponse = {
  clusterSizing: {
    totalNodes: 4,
    workerNodes: 1,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 24,
    totalMemory: 96,
  },
  resourceConsumption: {
    cpu: 45.2,
    memory: 52.8,
    limits: {
      cpu: 60.0,
      memory: 70.0,
    },
    overCommitRatio: {
      cpu: 2.0,
      memory: 1.0,
    },
  },
  inventoryTotals: {
    totalVMs: 10,
    totalCPU: 20,
    totalMemory: 40,
  },
};

/**
 * Mock response for a large enterprise cluster
 */
export const mockLargeClusterResponse = {
  clusterSizing: {
    totalNodes: 25,
    workerNodes: 22,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 1408,
    totalMemory: 5632,
  },
  resourceConsumption: {
    cpu: 92.1,
    memory: 88.7,
    limits: {
      cpu: 110.0,
      memory: 105.0,
    },
    overCommitRatio: {
      cpu: 6.0,
      memory: 1.0,
    },
  },
  inventoryTotals: {
    totalVMs: 500,
    totalCPU: 2000,
    totalMemory: 5000,
  },
};

/**
 * Mock response with control plane schedulable enabled
 */
export const mockControlPlaneSchedulableResponse = {
  clusterSizing: {
    totalNodes: 6,
    workerNodes: 3,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 192,
    totalMemory: 768,
  },
  resourceConsumption: {
    cpu: 78.4,
    memory: 65.2,
    limits: {
      cpu: 95.0,
      memory: 85.0,
    },
    overCommitRatio: {
      cpu: 1.0,
      memory: 1.0,
    },
  },
  inventoryTotals: {
    totalVMs: 75,
    totalCPU: 150,
    totalMemory: 500,
  },
};

/**
 * Mock response with high over-commit ratio (1:6)
 */
export const mockHighOvercommitResponse = {
  clusterSizing: {
    totalNodes: 5,
    workerNodes: 2,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 96,
    totalMemory: 384,
  },
  resourceConsumption: {
    cpu: 95.8,
    memory: 80.5,
    limits: {
      cpu: 120.0,
      memory: 100.0,
    },
    overCommitRatio: {
      cpu: 6.0,
      memory: 1.0,
    },
  },
  inventoryTotals: {
    totalVMs: 100,
    totalCPU: 400,
    totalMemory: 300,
  },
};

/**
 * Mock response with minimum configuration (single worker node)
 */
export const mockMinimalClusterResponse = {
  clusterSizing: {
    totalNodes: 4,
    workerNodes: 1,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 20,
    totalMemory: 52,
  },
  resourceConsumption: {
    cpu: 25.0,
    memory: 30.5,
    limits: {
      cpu: 35.0,
      memory: 45.0,
    },
    overCommitRatio: {
      cpu: 1.0,
      memory: 1.0,
    },
  },
  inventoryTotals: {
    totalVMs: 5,
    totalCPU: 5,
    totalMemory: 10,
  },
};

/**
 * Factory function to create a custom mock cluster sizing
 */
export const createMockClusterSizing = (
  overrides: Partial<ClusterSizingLike> = {},
): ClusterSizingLike => ({
  totalNodes: overrides.totalNodes ?? 8,
  workerNodes: overrides.workerNodes ?? 5,
  controlPlaneNodes: overrides.controlPlaneNodes ?? 3,
  failoverNodes: overrides.failoverNodes ?? 0,
  totalCPU: overrides.totalCPU ?? 128,
  totalMemory: overrides.totalMemory ?? 512,
});

/**
 * Factory function to create custom mock inventory totals
 */
export const createMockInventoryTotals = (
  overrides: Partial<InventoryTotalsLike> = {},
): InventoryTotalsLike => ({
  totalVMs: overrides.totalVMs ?? 50,
  totalCPU: overrides.totalCPU ?? 200,
  totalMemory: overrides.totalMemory ?? 400,
});

/**
 * Factory function to create custom mock resource consumption
 */
export const createMockResourceConsumption = (
  overrides: Partial<ResourceConsumptionLike> = {},
): ResourceConsumptionLike => ({
  cpu: overrides.cpu ?? 85.5,
  memory: overrides.memory ?? 72.3,
  limits: overrides.limits ?? {
    cpu: 100.0,
    memory: 90.0,
  },
  overCommitRatio: overrides.overCommitRatio ?? {
    cpu: 4.0,
    memory: 1.0,
  },
});

/**
 * Factory function to create a custom mock response
 */
export const createMockClusterRequirementsResponse = (
  overrides: Partial<ClusterRequirementsResponseLike> = {},
) => ({
  clusterSizing: overrides.clusterSizing ?? createMockClusterSizing(),
  inventoryTotals: overrides.inventoryTotals ?? createMockInventoryTotals(),
  resourceConsumption:
    overrides.resourceConsumption ?? createMockResourceConsumption(),
  optimizedSizing: overrides.optimizedSizing,
  savings: overrides.savings,
  optimizationStatus: overrides.optimizationStatus,
});

/**
 * Mock response with utilization-based optimization (side-by-side comparison)
 */
export const mockUtilizationComparisonResponse = {
  clusterSizing: {
    totalNodes: 28,
    workerNodes: 25,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 885,
    totalMemory: 2003,
  },
  optimizedSizing: {
    totalNodes: 15,
    workerNodes: 12,
    controlPlaneNodes: 3,
    failoverNodes: 0,
    totalCPU: 480,
    totalMemory: 1248,
    cpuUtilizationMax: 45.2,
    memoryUtilizationMax: 62.3,
    confidence: 87.5,
  },
  savings: {
    nodesSaved: 13,
    percentageReduction: 46.4,
    description: "vSphere metrics",
  },
  optimizationStatus: {
    attempted: true,
    reason: "success",
  },
  resourceConsumption: {
    cpu: 885,
    memory: 2003,
    limits: {
      cpu: 1100,
      memory: 2500,
    },
    overCommitRatio: {
      cpu: 4.0,
      memory: 2.0,
    },
  },
  inventoryTotals: {
    totalVMs: 120,
    totalCPU: 885,
    totalMemory: 2003,
  },
} as ClusterRequirementsResponseLike;

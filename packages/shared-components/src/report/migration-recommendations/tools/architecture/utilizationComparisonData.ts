import type {
  ClusterSizingLike,
  InventoryTotalsLike,
  SavingsLike,
} from "./clusterRequirementsResponseLike.js";
import type { SizingFormValues } from "./sizingFormTypes.js";
import { isControlPlaneOnlyClusterMode } from "./sizingFormTypes.js";
import {
  computeEffectiveCpu,
  computeEffectiveMemory,
} from "./utilizationSizing.js";

export interface UtilizationComparisonData {
  isSNO: boolean;
  cpuUtilization: number | undefined;
  memoryUtilization: number | undefined;
  effectiveCpu: number;
  effectiveMemory: number;
  savingsPercent: number;
}

export const getUtilizationComparisonData = ({
  formValues,
  optimizedSizing,
  inventoryTotals,
  savings,
}: {
  formValues: SizingFormValues;
  optimizedSizing: ClusterSizingLike;
  inventoryTotals: InventoryTotalsLike;
  savings: SavingsLike;
}): UtilizationComparisonData => {
  const cpuUtilization = optimizedSizing.cpuUtilizationMax;
  const memoryUtilization = optimizedSizing.memoryUtilizationMax;

  return {
    isSNO: isControlPlaneOnlyClusterMode(formValues.clusterMode),
    cpuUtilization,
    memoryUtilization,
    effectiveCpu: computeEffectiveCpu(inventoryTotals.totalCPU, cpuUtilization),
    effectiveMemory: computeEffectiveMemory(
      inventoryTotals.totalMemory,
      memoryUtilization,
    ),
    savingsPercent: Math.round(savings.percentageReduction),
  };
};

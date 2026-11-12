import {
  clusterSelectionExpression,
  combineFilterExpressions,
  vcenterSelectionExpression,
} from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmFilters";

/** VM filter for recommendation APIs aligned with report cluster + vCenter scope. */
export function buildRecommendationScopeExpression(
  clusterId: string | undefined,
  vcenterId: string | undefined,
): string | undefined {
  return combineFilterExpressions(
    vcenterSelectionExpression(vcenterId),
    clusterSelectionExpression(clusterId),
  );
}

import type {
  CollectionComparisonDiff,
  CollectionComparisonDiffDimensionEnum,
  CollectionComparisonSummary,
} from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "./agentApi";

export async function fetchCollectionComparison(
  agentApi: DefaultApiInterface,
  aId: string,
  bId: string,
): Promise<CollectionComparisonSummary> {
  return agentApi.compareCollections({ aId, bId });
}

export async function fetchCollectionComparisonDiff(
  agentApi: DefaultApiInterface,
  aId: string,
  bId: string,
  dimension: CollectionComparisonDiffDimensionEnum,
  page = 1,
  pageSize = 20,
): Promise<CollectionComparisonDiff> {
  return agentApi.compareCollectionsDiff({
    aId,
    bId,
    dimension,
    page,
    pageSize,
  });
}

/** Fetches all VM ID pages for both sides of a comparison diff. */
export async function fetchAllCollectionComparisonDiff(
  agentApi: DefaultApiInterface,
  aId: string,
  bId: string,
  dimension: CollectionComparisonDiffDimensionEnum,
  pageSize = 50,
): Promise<CollectionComparisonDiff> {
  const firstPage = await fetchCollectionComparisonDiff(
    agentApi,
    aId,
    bId,
    dimension,
    1,
    pageSize,
  );

  const maxPageCount = Math.max(
    firstPage.onlyInB.pageCount,
    firstPage.onlyInA.pageCount,
  );

  if (maxPageCount <= 1) {
    return firstPage;
  }

  const onlyInBIds = [...firstPage.onlyInB.vmIds];
  const onlyInAIds = [...firstPage.onlyInA.vmIds];

  for (let page = 2; page <= maxPageCount; page++) {
    const pageResponse = await fetchCollectionComparisonDiff(
      agentApi,
      aId,
      bId,
      dimension,
      page,
      pageSize,
    );
    onlyInBIds.push(...pageResponse.onlyInB.vmIds);
    onlyInAIds.push(...pageResponse.onlyInA.vmIds);
  }

  return {
    ...firstPage,
    onlyInB: {
      ...firstPage.onlyInB,
      vmIds: onlyInBIds,
    },
    onlyInA: {
      ...firstPage.onlyInA,
      vmIds: onlyInAIds,
    },
  };
}

/** Minimal VM detail surfaced in the comparison drill-down drawer. */
export interface ComparisonDiffVm {
  id: string;
  name: string;
  labels: string[];
}

/**
 * Resolves VM details for a set of diff VM ids. Individual lookups can fail
 * (e.g. a VM was pruned); those are dropped and counted rather than failing the
 * whole batch, so the caller can warn while still showing the totals.
 */
export async function loadComparisonDiffVms(
  agentApi: DefaultApiInterface,
  vmIds: string[],
  collectionId: string,
): Promise<{ rows: ComparisonDiffVm[]; failedCount: number }> {
  const results = await Promise.allSettled(
    vmIds.map(async (vmId) => {
      const vm = await agentApi.getVirtualMachine({ id: collectionId, vmId });
      return { id: vm.id, name: vm.name, labels: vm.labels ?? [] };
    }),
  );

  let failedCount = 0;
  const rows = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }
    failedCount += 1;
    console.warn(
      "Failed to load virtual machine details for comparison drawer:",
      vmIds[index],
      result.reason,
    );
    return [];
  });

  return { rows, failedCount };
}

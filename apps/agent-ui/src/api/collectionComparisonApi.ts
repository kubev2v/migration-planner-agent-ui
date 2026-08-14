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

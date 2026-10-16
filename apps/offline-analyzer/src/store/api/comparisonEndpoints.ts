import type {
  Collection,
  CollectionComparisonDiff,
  CollectionComparisonDiffDimensionEnum,
  CollectionComparisonSummary,
} from "@openshift-migration-advisor/agent-sdk";
import { listCollectionsNewestFirst } from "../../api/collectionApi";
import {
  type ComparisonDiffVm,
  fetchAllCollectionComparisonDiff,
  fetchCollectionComparison,
  loadComparisonDiffVms,
} from "../../api/collectionComparisonApi";
import { agentApiSlice } from "./agentApiSlice";

const DIFF_PAGE_SIZE = 50;

interface CompareCollectionsArg {
  /** Baseline ("from") collection id. */
  aId: string;
  /** Comparison target ("to") collection id. */
  bId: string;
}

interface ComparisonDiffArg extends CompareCollectionsArg {
  dimension: CollectionComparisonDiffDimensionEnum;
}

/** Diff plus the resolved VM details for each side of the drill-down drawer. */
export interface ComparisonDiffDetails {
  diff: CollectionComparisonDiff;
  onlyInB: ComparisonDiffVm[];
  onlyInA: ComparisonDiffVm[];
  failedCount: number;
}

interface ExportCollectionArg {
  id: string;
  /** Comma-separated export scopes; defaults to "overview". */
  scope?: string;
}

/**
 * Report-comparison endpoints. The collection list, the summary comparison and
 * the per-metric drill-down all read from the cache; a completed report
 * invalidates the shared `Collections` tag so every entry refetches together.
 */
export const comparisonEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    // The available report collections, newest-first (drives the selectors).
    listCollections: build.query<Collection[], void>({
      query: () => (sdk) => listCollectionsNewestFirst(sdk),
      providesTags: ["Collections"],
    }),

    // Summary metrics between two collections.
    compareCollections: build.query<
      CollectionComparisonSummary,
      CompareCollectionsArg
    >({
      query:
        ({ aId, bId }) =>
        (sdk) =>
          fetchCollectionComparison(sdk, aId, bId),
      providesTags: ["Collections"],
    }),

    // Drill-down for one metric: the full paginated VM-id diff plus the resolved
    // VM details for each side, collapsed into a single cache entry so the
    // drawer holds no server-state of its own.
    getComparisonDiff: build.query<ComparisonDiffDetails, ComparisonDiffArg>({
      query:
        ({ aId, bId, dimension }) =>
        async (sdk) => {
          const diff = await fetchAllCollectionComparisonDiff(
            sdk,
            aId,
            bId,
            dimension,
            DIFF_PAGE_SIZE,
          );
          const [onlyInB, onlyInA] = await Promise.all([
            loadComparisonDiffVms(sdk, diff.onlyInB.vmIds, bId),
            loadComparisonDiffVms(sdk, diff.onlyInA.vmIds, aId),
          ]);
          return {
            diff,
            onlyInB: onlyInB.rows,
            onlyInA: onlyInA.rows,
            failedCount: onlyInB.failedCount + onlyInA.failedCount,
          };
        },
      providesTags: ["Collections"],
    }),

    // Download a collection export archive (Blob); no cache impact.
    exportCollection: build.mutation<Blob, ExportCollectionArg>({
      query:
        ({ id, scope }) =>
        (sdk) =>
          sdk.exportCollection({ id, scope }),
    }),
  }),
});

export const {
  useListCollectionsQuery,
  useCompareCollectionsQuery,
  useGetComparisonDiffQuery,
  useExportCollectionMutation,
} = comparisonEndpoints;

import type { Collection } from "@openshift-migration-advisor/offline-analyzer-sdk";
import { listCollectionsNewestFirst } from "../../api/collectionApi";
import { agentApiSlice } from "./agentApiSlice";

interface ExportCollectionArg {
  id: string;
  /** Comma-separated export scopes; defaults to "overview". */
  scope?: string;
}

/** Collection data endpoints used by the analyzer views. */
export const collectionsEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    // The available report collections, newest-first (drives the selectors).
    listCollections: build.query<Collection[], void>({
      query: () => (sdk) => listCollectionsNewestFirst(sdk),
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

export const { useListCollectionsQuery, useExportCollectionMutation } =
  collectionsEndpoints;

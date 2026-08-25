import { getAgentApiBasePath } from "../../api/agentApiConfig";
import { getForecasterStatus as fetchForecasterStatus } from "../../pages/StorageOffloadEstimator/utils/forecasterApi";
import type { ForecasterStatus } from "../../pages/StorageOffloadEstimator/utils/forecasterTypes";
import { agentApiSlice } from "./agentApiSlice";

/**
 * Storage-offload forecaster endpoints. The forecaster is a separate service
 * reached over raw `fetch` (see `forecasterApi.ts`), so — like the inventory
 * endpoint — the `query` callback derives the base path from the shared SDK
 * client via `getAgentApiBasePath(sdk)` and delegates to the existing helper.
 *
 * `getForecasterStatus` is the polled endpoint that replaces the hand-rolled
 * `useForecasterPolling` interval loop: consumers drive polling with RTK
 * Query's `pollingInterval` and stop it (interval `0` / `skip`) once the
 * benchmark returns to the `ready` terminal state.
 */
export const forecasterEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    // Current forecaster service state + per-pair progress. Polled while a
    // benchmark is running; the shared `Forecaster` tag lets any future
    // mutation force an immediate refetch.
    getForecasterStatus: build.query<ForecasterStatus, void>({
      query: () => (sdk) => fetchForecasterStatus(getAgentApiBasePath(sdk)),
      providesTags: ["Forecaster"],
    }),
  }),
});

export const { useGetForecasterStatusQuery, useLazyGetForecasterStatusQuery } =
  forecasterEndpoints;

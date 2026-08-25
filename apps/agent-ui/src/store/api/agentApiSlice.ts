import { createApi } from "@reduxjs/toolkit/query/react";
import { sdkBaseQuery } from "../baseQuery";

/** Cache tag types used for cross-endpoint invalidation. */
export const AGENT_API_TAGS = [
  "Group",
  "GroupVms",
  "GroupInventory",
  "Vms",
  "Inventory",
  "VmLabels",
  "Credentials",
] as const;

/**
 * Single RTK Query API instance for the agent UI. One `createApi` means one
 * cache, one middleware and one tag registry, which is what makes a single
 * mutation invalidate every dependent query (e.g. header + table counts).
 *
 * Endpoints are attached via `injectEndpoints` in per-domain files
 * (`groupsEndpoints.ts`, `vmsEndpoints.ts`).
 */
export const agentApiSlice = createApi({
  reducerPath: "agentApi",
  baseQuery: sdkBaseQuery(),
  tagTypes: AGENT_API_TAGS,
  endpoints: () => ({}),
});

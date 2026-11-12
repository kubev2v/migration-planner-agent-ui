import type { RecommendationToolId } from "@openshift-migration-advisor/shared-components";

/** Tools backed by the analyzer API today (`POST /complexity-estimation`). */
export const ENABLED_RECOMMENDATION_TOOL_IDS: RecommendationToolId[] = [
  "complexity",
];

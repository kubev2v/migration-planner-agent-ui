import type { RecommendationToolId } from "@openshift-migration-advisor/shared-components";

/** Tools backed by the analyzer recommendations API today. */
export const ENABLED_RECOMMENDATION_TOOL_IDS: RecommendationToolId[] = [
  "time-estimation",
  "complexity",
];

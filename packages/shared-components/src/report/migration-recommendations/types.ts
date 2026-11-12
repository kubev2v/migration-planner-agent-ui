export type RecommendationToolId =
  | "architecture"
  | "cost-estimation"
  | "time-estimation"
  | "complexity";

export interface RecommendationToolCard {
  id: RecommendationToolId;
  title: string;
  description: string;
  isDisabled: boolean;
}

export interface RecommendationToolCatalogOptions {
  isAggregateView: boolean;
  isPartner?: boolean;
  /** When set, only these tools appear (e.g. partial agent/analyzer API support). */
  enabledToolIds?: RecommendationToolId[];
}

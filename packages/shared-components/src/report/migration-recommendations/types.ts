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
}

import type {
  RecommendationToolCard,
  RecommendationToolCatalogOptions,
  RecommendationToolId,
} from "./types.js";

export const RECOMMENDATION_TOOL_CARDS: RecommendationToolCard[] = [
  {
    id: "architecture",
    title: "OpenShift cluster architecture",
    description:
      "Define architecture inputs and target cluster profile recommendations.",
    isDisabled: false,
  },
  {
    id: "cost-estimation",
    title: "Cost estimation",
    description:
      "Compare VMware plans against a Red Hat solution over three years (TCO).",
    isDisabled: false,
  },
  {
    id: "time-estimation",
    title: "Migration time estimation",
    description:
      "Estimate migration duration based on workload and throughput assumptions.",
    isDisabled: false,
  },
  {
    id: "complexity",
    title: "Migration complexity",
    description:
      "View complexity signals to compare migration effort across clusters.",
    isDisabled: false,
  },
];

const ENVIRONMENT_WIDE_TOOL_IDS: RecommendationToolId[] = [
  "architecture",
  "cost-estimation",
  "time-estimation",
  "complexity",
];

const CLUSTER_TOOL_IDS: RecommendationToolId[] = [
  "architecture",
  "cost-estimation",
  "time-estimation",
  "complexity",
];

const isCatalogToolVisible = (
  toolId: RecommendationToolId,
  isPartner: boolean,
): boolean => {
  if (toolId === "cost-estimation" && !isPartner) {
    return false;
  }
  return true;
};

export const isRecommendationToolAvailable = (
  toolId: RecommendationToolId,
  { isAggregateView, isPartner = false }: RecommendationToolCatalogOptions,
): boolean => {
  const availableIds = isAggregateView
    ? ENVIRONMENT_WIDE_TOOL_IDS
    : CLUSTER_TOOL_IDS;
  return (
    availableIds.includes(toolId) && isCatalogToolVisible(toolId, isPartner)
  );
};

export const getRecommendationToolCards = ({
  isAggregateView,
  isPartner = false,
}: RecommendationToolCatalogOptions): RecommendationToolCard[] => {
  const availableIds = isAggregateView
    ? ENVIRONMENT_WIDE_TOOL_IDS
    : CLUSTER_TOOL_IDS;
  return RECOMMENDATION_TOOL_CARDS.filter(
    (card) =>
      availableIds.includes(card.id) &&
      isCatalogToolVisible(card.id, isPartner),
  );
};

export const getRecommendationToolTitle = (
  toolId: RecommendationToolId,
): string =>
  RECOMMENDATION_TOOL_CARDS.find((card) => card.id === toolId)?.title ?? "";

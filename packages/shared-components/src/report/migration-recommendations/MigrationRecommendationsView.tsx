import type { FC, ReactNode } from "react";

import { getRecommendationToolCards } from "./constants.js";
import { RecommendationToolsLanding } from "./RecommendationToolsLanding.js";
import type { RecommendationToolId } from "./types.js";

export interface MigrationRecommendationsViewProps {
  selectedTool: RecommendationToolId | null;
  onSelectTool: (toolId: RecommendationToolId) => void;
  isAggregateView: boolean;
  areToolsDisabled?: boolean;
  canOpenArchitecture?: boolean;
  isPartner?: boolean;
  enabledToolIds?: RecommendationToolId[];
  renderSelectedTool: (toolId: RecommendationToolId) => ReactNode;
}

export const MigrationRecommendationsView: FC<
  MigrationRecommendationsViewProps
> = ({
  selectedTool,
  onSelectTool,
  isAggregateView,
  areToolsDisabled = false,
  canOpenArchitecture = true,
  isPartner = false,
  enabledToolIds,
  renderSelectedTool,
}) => {
  if (!selectedTool) {
    const tools = getRecommendationToolCards({
      isAggregateView,
      isPartner,
      enabledToolIds,
    }).map((card) =>
      card.id === "architecture" && !canOpenArchitecture
        ? { ...card, isDisabled: true }
        : card,
    );
    return (
      <RecommendationToolsLanding
        tools={tools}
        onSelectTool={onSelectTool}
        areToolsDisabled={areToolsDisabled}
      />
    );
  }

  return <>{renderSelectedTool(selectedTool)}</>;
};

MigrationRecommendationsView.displayName = "MigrationRecommendationsView";

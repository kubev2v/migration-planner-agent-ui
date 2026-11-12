import {
  MigrationRecommendationsView,
  type RecommendationToolId,
} from "@openshift-migration-advisor/shared-components";
import type { FC } from "react";
import { ENABLED_RECOMMENDATION_TOOL_IDS } from "./enabledRecommendationTools";
import { RecommendationToolsRouter } from "./RecommendationToolsRouter";

export interface MigrationRecommendationsPanelProps {
  selectedTool: RecommendationToolId | null;
  onSelectTool: (toolId: RecommendationToolId) => void;
  onBack: () => void;
  isAggregateView: boolean;
  areToolsDisabled?: boolean;
  clusterName: string;
  /** Latest collection id; included in tool remount keys when inventory is re-collected. */
  collectionId?: string;
  filterExpression: string | undefined;
}

export const MigrationRecommendationsPanel: FC<
  MigrationRecommendationsPanelProps
> = ({
  selectedTool,
  onSelectTool,
  onBack,
  isAggregateView,
  areToolsDisabled = false,
  clusterName,
  collectionId,
  filterExpression,
}) => (
  <MigrationRecommendationsView
    selectedTool={selectedTool}
    onSelectTool={onSelectTool}
    isAggregateView={isAggregateView}
    areToolsDisabled={areToolsDisabled}
    canOpenArchitecture={false}
    enabledToolIds={ENABLED_RECOMMENDATION_TOOL_IDS}
    renderSelectedTool={(tool) => (
      <RecommendationToolsRouter
        key={`${collectionId ?? "none"}-${clusterName}-${tool}`}
        tool={tool}
        onBack={onBack}
        clusterName={clusterName}
        filterExpression={filterExpression}
      />
    )}
  />
);

MigrationRecommendationsPanel.displayName = "MigrationRecommendationsPanel";

import {
  getRecommendationToolTitle,
  type RecommendationToolId,
  ToolLayout,
} from "@openshift-migration-advisor/shared-components";
import { Alert } from "@patternfly/react-core";
import type { FC } from "react";
import { ComplexityToolView } from "./ComplexityToolView";
import { ENABLED_RECOMMENDATION_TOOL_IDS } from "./enabledRecommendationTools";
import { TimeEstimationToolView } from "./TimeEstimationToolView";

export interface RecommendationToolsRouterProps {
  tool: RecommendationToolId;
  onBack: () => void;
  clusterName: string;
  filterExpression: string | undefined;
}

export const RecommendationToolsRouter: FC<RecommendationToolsRouterProps> = ({
  tool,
  onBack,
  clusterName,
  filterExpression,
}) => {
  if (tool === "time-estimation") {
    return (
      <TimeEstimationToolView
        onBack={onBack}
        clusterName={clusterName}
        filterExpression={filterExpression}
      />
    );
  }

  if (tool === "complexity") {
    return (
      <ComplexityToolView
        onBack={onBack}
        clusterName={clusterName}
        filterExpression={filterExpression}
      />
    );
  }

  if (!ENABLED_RECOMMENDATION_TOOL_IDS.includes(tool)) {
    return (
      <ToolLayout title={getRecommendationToolTitle(tool)} onBack={onBack}>
        <Alert variant="info" title="Not available yet" isInline>
          This recommendation tool is not available in this release.
        </Alert>
      </ToolLayout>
    );
  }

  return null;
};

RecommendationToolsRouter.displayName = "RecommendationToolsRouter";

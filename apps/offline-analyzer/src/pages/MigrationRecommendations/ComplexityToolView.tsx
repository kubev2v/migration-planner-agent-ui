import {
  ComplexityResult,
  getRecommendationToolTitle,
  MigrationComplexityHelpPopover,
  ToolLayout,
} from "@openshift-migration-advisor/shared-components";
import type { FC } from "react";
import { useComplexityToolViewModel } from "./useComplexityToolViewModel";

export interface ComplexityToolViewProps {
  onBack: () => void;
  clusterName: string;
  filterExpression: string | undefined;
}

export const ComplexityToolView: FC<ComplexityToolViewProps> = ({
  onBack,
  clusterName,
  filterExpression,
}) => {
  const { complexityEstimation, isCalculatingComplexity, complexityError } =
    useComplexityToolViewModel(filterExpression);

  return (
    <ToolLayout
      title={getRecommendationToolTitle("complexity")}
      help={<MigrationComplexityHelpPopover />}
      onBack={onBack}
    >
      <ComplexityResult
        clusterName={clusterName}
        complexityOutput={complexityEstimation}
        isLoading={isCalculatingComplexity}
        error={complexityError}
        estimationByComplexity={null}
        isLoadingEstimationByComplexity={false}
        estimationByComplexityError={null}
      />
    </ToolLayout>
  );
};

ComplexityToolView.displayName = "ComplexityToolView";

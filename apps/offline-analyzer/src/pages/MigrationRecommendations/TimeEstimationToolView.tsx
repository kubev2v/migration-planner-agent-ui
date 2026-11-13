import {
  generateTimeEstimationPlainText,
  getRecommendationToolTitle,
  type RecommendationPhase,
  RecommendationTemplate,
  RecommendationToolActions,
  TimeEstimationForm,
  TimeEstimationResult,
  ToolLayout,
} from "@openshift-migration-advisor/shared-components";
import { Alert } from "@patternfly/react-core";
import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { canCopyToClipboard, copyToClipboard } from "../../utils/clipboard";
import { useTimeEstimationToolViewModel } from "./useTimeEstimationToolViewModel";

export interface TimeEstimationToolViewProps {
  onBack: () => void;
  clusterName: string;
  filterExpression: string | undefined;
}

export const TimeEstimationToolView: FC<TimeEstimationToolViewProps> = ({
  onBack,
  clusterName,
  filterExpression,
}) => {
  const {
    estimationFormValues,
    setEstimationFormValues,
    migrationEstimation,
    isCalculatingEstimation,
    estimationError,
    calculateEstimation,
  } = useTimeEstimationToolViewModel(filterExpression);

  const [phase, setPhase] = useState<RecommendationPhase>("form");
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!migrationEstimation) {
      setCopyError(null);
    }
  }, [migrationEstimation]);

  const handleCalculate = useCallback(() => {
    void calculateEstimation();
  }, [calculateEstimation]);

  const handleEdit = useCallback(() => {
    setPhase("form");
  }, []);

  const handleCopy = useCallback(() => {
    if (!migrationEstimation) return;
    setCopyError(null);
    void copyToClipboard(
      generateTimeEstimationPlainText(migrationEstimation),
    ).catch((err: unknown) => {
      setCopyError(
        err instanceof Error ? err.message : "Failed to copy to clipboard",
      );
    });
  }, [migrationEstimation]);

  return (
    <ToolLayout
      title={getRecommendationToolTitle("time-estimation")}
      onBack={onBack}
      actions={
        phase === "results" ? (
          <RecommendationToolActions
            isReadOnly={false}
            isEditDisabled={isCalculatingEstimation}
            onEdit={handleEdit}
            canCopy={canCopyToClipboard() && Boolean(migrationEstimation)}
            onCopy={handleCopy}
          />
        ) : undefined
      }
    >
      {copyError ? (
        <Alert variant="danger" title="Copy failed" isInline>
          {copyError}
        </Alert>
      ) : null}
      <RecommendationTemplate
        id="time-estimation"
        preferencesContent={
          <TimeEstimationForm
            values={estimationFormValues}
            onChange={setEstimationFormValues}
          />
        }
        resultsContent={
          <TimeEstimationResult
            clusterName={clusterName}
            estimationOutput={migrationEstimation}
            isLoading={isCalculatingEstimation}
            error={estimationError}
          />
        }
        onGenerate={handleCalculate}
        isLoading={isCalculatingEstimation}
        generateButtonText="Calculate"
        showAlert={false}
        phase={phase}
        onPhaseChange={setPhase}
      />
    </ToolLayout>
  );
};

TimeEstimationToolView.displayName = "TimeEstimationToolView";

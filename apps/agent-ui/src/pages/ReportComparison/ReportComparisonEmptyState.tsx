import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from "@patternfly/react-core";
import { HistoryIcon } from "@patternfly/react-icons";
import type React from "react";

interface ReportComparisonEmptyStateProps {
  reportCount: number;
  onRunNewReportClick?: () => void;
  isCollecting?: boolean;
}

export const ReportComparisonEmptyState: React.FC<
  ReportComparisonEmptyStateProps
> = ({ reportCount, onRunNewReportClick, isCollecting = false }) => {
  const body =
    reportCount === 0 ? (
      <>
        No reports are available yet. Run a report to capture an infrastructure
        snapshot before comparing changes over time.
      </>
    ) : (
      <>
        You need at least two reports to compare data. Run a second report to
        capture a fresh snapshot and track infrastructure changes over time.
      </>
    );

  return (
    <EmptyState
      variant={EmptyStateVariant.sm}
      titleText="No comparison data available yet"
      headingLevel="h4"
      icon={HistoryIcon}
    >
      <EmptyStateBody>{body}</EmptyStateBody>
      {onRunNewReportClick ? (
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              onClick={onRunNewReportClick}
              isDisabled={isCollecting}
            >
              Run new report
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      ) : null}
    </EmptyState>
  );
};

ReportComparisonEmptyState.displayName = "ReportComparisonEmptyState";

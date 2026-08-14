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
import { useReportsContext } from "../../common/report/ReportsContext";

interface ReportComparisonEmptyStateProps {
  reportCount: number;
}

export const ReportComparisonEmptyState: React.FC<
  ReportComparisonEmptyStateProps
> = ({ reportCount }) => {
  const { openModal, isCollecting } = useReportsContext();

  return (
    <EmptyState
      variant={EmptyStateVariant.sm}
      titleText="No comparison data available yet"
      headingLevel="h4"
      icon={HistoryIcon}
    >
      <EmptyStateBody>
        {reportCount === 0 ? (
          <>
            No reports are available yet. Run a report to capture an
            infrastructure snapshot before comparing changes over time.
          </>
        ) : (
          <>
            You need at least two reports to compare data. Run a second report
            to capture a fresh snapshot and track infrastructure changes over
            time.
          </>
        )}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            variant="primary"
            onClick={openModal}
            isDisabled={isCollecting}
          >
            Run new report
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};

ReportComparisonEmptyState.displayName = "ReportComparisonEmptyState";

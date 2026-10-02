import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Icon,
} from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { dashboardStyles } from "./dashboardStyles.js";
import { ReportTable } from "./ReportTable.js";

/**
 * Minimal shape of a migration issue consumed by {@link ErrorTable}. Declared
 * locally so this package does not depend on a specific SDK (`agent-sdk` or
 * `planner-sdk`); callers pass the subset of `MigrationIssue` fields read here.
 */
export interface MigrationIssueLike {
  label: string;
  assessment: string;
  count: number;
}

export interface ErrorTableProps {
  errors: MigrationIssueLike[];
  /** Optional drill-down callback invoked with an issue's `label`. */
  onConcernClick?: (concernLabel: string) => void;
}

export const ErrorTable: React.FC<ErrorTableProps> = ({
  errors,
  onConcernClick,
}) => {
  const handleRowClick = (issue: MigrationIssueLike) => {
    if (issue.label && onConcernClick) {
      onConcernClick(issue.label);
    }
  };

  const chartId = "errors-table";
  const chartTitle = "Errors";

  return (
    <ChartExportSurface id={chartId} title={chartTitle}>
      <Card className={dashboardStyles.card}>
        <CardTitle>
          <Flex
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <Icon status="danger">
                <ExclamationCircleIcon />
              </Icon>{" "}
              Errors
            </FlexItem>
            <ChartHeaderActions chartId={chartId} title={chartTitle} />
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {errors.length === 0 ? (
            <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.errors} />
          ) : (
            <div>
              <ReportTable<MigrationIssueLike>
                data={errors}
                columns={["Description", "Total VMs"]}
                fields={["assessment", "count"]}
                onRowClick={onConcernClick ? handleRowClick : undefined}
                clickableFields={onConcernClick ? ["assessment"] : []}
              />
            </div>
          )}
        </CardBody>
      </Card>
    </ChartExportSurface>
  );
};

ErrorTable.displayName = "ErrorTable";

import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Icon,
} from "@patternfly/react-core";
import { ExclamationTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { dashboardStyles } from "./dashboardStyles.js";
import type { MigrationIssueLike } from "./ErrorTable.js";
import { ReportTable } from "./ReportTable.js";

export interface WarningsTableProps {
  warnings: MigrationIssueLike[];
  /** Optional drill-down callback invoked with an issue's `label`. */
  onConcernClick?: (concernLabel: string) => void;
}

export const WarningsTable: React.FC<WarningsTableProps> = ({
  warnings,
  onConcernClick,
}) => {
  const handleRowClick = (issue: MigrationIssueLike) => {
    if (issue.label && onConcernClick) {
      onConcernClick(issue.label);
    }
  };

  const chartId = "warnings-table";
  const chartTitle = "Warnings";

  return (
    <ChartExportSurface id={chartId} title={chartTitle}>
      <Card className={dashboardStyles.card}>
        <CardTitle>
          <Flex
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <Icon status="warning">
                <ExclamationTriangleIcon />
              </Icon>{" "}
              Warnings
            </FlexItem>
            <ChartHeaderActions chartId={chartId} title={chartTitle} />
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {warnings.length === 0 ? (
            <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.warnings} />
          ) : (
            <div>
              <ReportTable<MigrationIssueLike>
                data={warnings}
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

WarningsTable.displayName = "WarningsTable";

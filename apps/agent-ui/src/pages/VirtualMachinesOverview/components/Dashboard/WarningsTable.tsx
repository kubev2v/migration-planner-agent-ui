import type { MigrationIssue } from "@openshift-migration-advisor/agent-sdk";
import {
  ChartExportSurface,
  ChartHeaderActions,
  dashboardStyles,
} from "@openshift-migration-advisor/shared-components";
import {
  Card,
  CardBody,
  CardTitle,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Icon,
} from "@patternfly/react-core";
import { ExclamationTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { AppEmptyState } from "../../../../common/components";
import { ReportTable } from "../../../Groups/components/ReportTable";

interface WarningsTableProps {
  warnings: MigrationIssue[];
  onConcernClick?: (concernLabel: string) => void;
}

export const WarningsTable: React.FC<WarningsTableProps> = ({
  warnings,
  onConcernClick,
}) => {
  const handleRowClick = (issue: MigrationIssue) => {
    if (issue.label && onConcernClick) {
      onConcernClick(issue.label);
    }
  };

  const chartId = "warnings-table";
  const chartTitle = "Warnings";

  return (
    <Card className={dashboardStyles.card} id={chartId}>
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
        <ChartExportSurface id={chartId} title={chartTitle}>
          {warnings.length === 0 ? (
            <AppEmptyState
              titleText="No warning found"
              status="success"
              variant={EmptyStateVariant.xs}
              wrapInBullseye={false}
            />
          ) : (
            <div>
              <ReportTable<MigrationIssue>
                data={warnings}
                columns={["Description", "Total VMs"]}
                fields={["assessment", "count"]}
                onRowClick={onConcernClick ? handleRowClick : undefined}
                clickableFields={onConcernClick ? ["assessment"] : []}
              />
            </div>
          )}
        </ChartExportSurface>
      </CardBody>
    </Card>
  );
};

import type { MigrationIssue } from "@openshift-migration-advisor/agent-sdk";
import {
  Card,
  CardBody,
  CardTitle,
  EmptyStateVariant,
  Icon,
} from "@patternfly/react-core";
import { ExclamationTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { AppEmptyState } from "../../../../common/components";
import { ReportTable } from "../../../Groups/components/ReportTable";
import { dashboardStyles } from "./dashboardStyles";

interface WarningsTableProps {
  warnings: MigrationIssue[];
  isExportMode?: boolean;
  onConcernClick?: (concernLabel: string) => void;
}

export const WarningsTable: React.FC<WarningsTableProps> = ({
  warnings,
  isExportMode = false,
  onConcernClick,
}) => {
  const handleRowClick = (issue: MigrationIssue) => {
    if (issue.label && onConcernClick) {
      onConcernClick(issue.label);
    }
  };

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="warnings-table"
    >
      <CardTitle>
        <Icon status="warning">
          <ExclamationTriangleIcon />
        </Icon>{" "}
        Warnings
      </CardTitle>
      <CardBody className={dashboardStyles.cardBodyScrollable}>
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
              withoutBorder
              onRowClick={
                onConcernClick && !isExportMode ? handleRowClick : undefined
              }
              clickableFields={
                onConcernClick && !isExportMode ? ["assessment"] : []
              }
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
};

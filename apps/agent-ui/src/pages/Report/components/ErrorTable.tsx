import type { MigrationIssue } from "@openshift-migration-advisor/agent-sdk";
import { Card, CardBody, CardTitle, Icon } from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { dashboardStyles } from "./dashboardStyles";
import { ReportTable } from "./ReportTable";

interface ErrorTableProps {
  errors: MigrationIssue[];
  isExportMode?: boolean;
  onConcernClick?: (concernLabel: string) => void;
}

export const ErrorTable: React.FC<ErrorTableProps> = ({
  errors,
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
      id="errors-table"
    >
      <CardTitle>
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>{" "}
        Errors
      </CardTitle>
      <CardBody>
        {errors.length === 0 ? (
          <div>No errors found</div>
        ) : (
          <div>
            <ReportTable<MigrationIssue>
              data={errors}
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

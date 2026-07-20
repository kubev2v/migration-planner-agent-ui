import type { MigrationIssue } from "@openshift-migration-advisor/agent-sdk";
import {
  Card,
  CardBody,
  CardTitle,
  EmptyStateVariant,
  Icon,
} from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { AppEmptyState } from "../../../../common/components";
import { ReportTable } from "../../../Groups/components/ReportTable";
import { dashboardStyles } from "./dashboardStyles";

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
          <AppEmptyState
            titleText="No errors found"
            status="success"
            variant={EmptyStateVariant.xs}
            wrapInBullseye={false}
          />
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

import type { MigrationIssue } from "@openshift-migration-advisor/agent-sdk";
import { dashboardStyles } from "@openshift-migration-advisor/shared-components";
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
import {
  ChartDownloadButton,
  ChartHeaderActions,
} from "../Export/ChartDownloadButton";

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
          {!isExportMode && (
            <ChartHeaderActions>
              <ChartDownloadButton
                chartId="warnings"
                title="Warnings"
                getNode={() => (
                  <WarningsTable warnings={warnings} isExportMode />
                )}
              />
            </ChartHeaderActions>
          )}
        </Flex>
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

import { Button, Content, Flex, FlexItem } from "@patternfly/react-core";
import { SyncAltIcon } from "@patternfly/react-icons";
import type React from "react";
import { formatReportRunDate } from "../../pages/ReportComparison/comparisonFormatting";

interface ReportActionsProps {
  latestReportRun: Date | null;
  isCollecting: boolean;
  onRunNewReportClick?: () => void;
}

export const RunReport: React.FC<ReportActionsProps> = ({
  latestReportRun,
  isCollecting,
  onRunNewReportClick,
}) => {
  if (!latestReportRun) return null;
  return (
    <Flex alignItems={{ default: "alignItemsCenter" }}>
      <FlexItem>
        <Content component="p">
          Latest run: {formatReportRunDate(latestReportRun)}
        </Content>
      </FlexItem>
      <FlexItem>
        <Button
          variant="secondary"
          onClick={onRunNewReportClick}
          icon={<SyncAltIcon />}
          isDisabled={isCollecting}
        >
          Run new report
        </Button>
      </FlexItem>
    </Flex>
  );
};

RunReport.displayName = "RunReport";

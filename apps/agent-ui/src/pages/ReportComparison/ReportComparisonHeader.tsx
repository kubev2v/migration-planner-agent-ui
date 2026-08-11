import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { ExportIcon } from "@patternfly/react-icons";
import type React from "react";
import { RunReport } from "../../common/components/RunReport";

interface ReportComparisonHeaderProps {
  latestReportRun?: Date | null;
  showRunNewReport?: boolean;
  isCollecting?: boolean;
  onRunNewReportClick?: () => void;
  showExport?: boolean;
  onExportClick?: () => void;
  isExporting?: boolean;
  description?: React.ReactNode;
}

export const ReportComparisonHeader: React.FC<ReportComparisonHeaderProps> = ({
  latestReportRun = null,
  showRunNewReport = false,
  isCollecting = false,
  onRunNewReportClick,
  showExport = false,
  onExportClick,
  isExporting = false,
  description,
}) => {
  const canRunNewReport = showRunNewReport && Boolean(onRunNewReportClick);
  const canExport = showExport && Boolean(onExportClick);

  return (
    <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
      <FlexItem>
        <Content component={ContentVariants.h1}>Report comparison</Content>
        {description ? <Content component="p">{description}</Content> : null}
      </FlexItem>
      <Flex alignItems={{ default: "alignItemsCenter" }}>
        {canRunNewReport ? (
          <RunReport
            latestReportRun={latestReportRun}
            isCollecting={isCollecting}
            onRunNewReportClick={onRunNewReportClick}
          />
        ) : null}
        {canExport ? (
          <FlexItem>
            <Button
              variant="link"
              onClick={onExportClick}
              icon={<ExportIcon />}
              isLoading={isExporting}
              isDisabled={isExporting}
            >
              Export To report as ZIP
            </Button>
          </FlexItem>
        ) : null}
      </Flex>
    </Flex>
  );
};

ReportComparisonHeader.displayName = "ReportComparisonHeader";

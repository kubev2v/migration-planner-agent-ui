import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
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
import { DiscoveryStatus } from "../../common/DiscoveryStatus";

interface ReportPageHeaderProps {
  agentStatus: AgentStatus | null | undefined;
  latestReportRun?: Date | null;
  showRunNewReport?: boolean;
  isCollecting?: boolean;
  onRunNewReportClick?: () => void;
  showExport?: boolean;
  onExportClick?: () => void;
}

export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  agentStatus,
  latestReportRun = null,
  showRunNewReport = false,
  isCollecting = false,
  onRunNewReportClick,
  showExport = false,
  onExportClick,
}) => {
  const canRunNewReport = showRunNewReport && Boolean(onRunNewReportClick);
  const canExport = showExport && Boolean(onExportClick);

  return (
    <Flex justifyContent={{ default: "justifyContentSpaceBetween" }}>
      <FlexItem>
        <Content component={ContentVariants.h1}>
          Virtual machines overview
        </Content>
        <DiscoveryStatus agentStatus={agentStatus} />
      </FlexItem>
      <Flex alignItems={{ default: "alignItemsCenter" }}>
        {canRunNewReport && (
          <RunReport
            latestReportRun={latestReportRun}
            isCollecting={isCollecting}
            onRunNewReportClick={onRunNewReportClick}
          />
        )}
        {canExport && (
          <FlexItem>
            <Button
              variant="link"
              onClick={onExportClick}
              icon={<ExportIcon />}
            >
              Export
            </Button>
          </FlexItem>
        )}
      </Flex>
    </Flex>
  );
};

ReportPageHeader.displayName = "ReportPageHeader";

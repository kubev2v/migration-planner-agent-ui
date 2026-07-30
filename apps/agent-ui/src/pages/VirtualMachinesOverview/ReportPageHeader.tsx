import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
import { Button, Content, Title } from "@patternfly/react-core";
import { ExportIcon } from "@patternfly/react-icons";
import type React from "react";
import { DiscoveryStatus } from "../../common/DiscoveryStatus";

interface ReportPageHeaderProps {
  agentStatus: AgentStatus | null | undefined;
  onExportClick: () => void;
}

export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  agentStatus,
  onExportClick,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "16px",
      }}
    >
      <div>
        <Title headingLevel="h1" size="2xl">
          Virtual machines overview
        </Title>
        <Content component="p" style={{ marginTop: "8px" }}>
          Red Hat sharing status: <DiscoveryStatus agentStatus={agentStatus} />
        </Content>
      </div>
      <Button variant="link" onClick={onExportClick} icon={<ExportIcon />}>
        Export
      </Button>
    </div>
  );
};

ReportPageHeader.displayName = "ReportPageHeader";

import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
import { Tooltip } from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { getDiscoverySharingStatus } from "./formatDiscoveryStatus";

const statusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

interface DiscoveryStatusProps {
  agentStatus: AgentStatus | null | undefined;
}

export const DiscoveryStatus: React.FC<DiscoveryStatusProps> = ({
  agentStatus,
}) => {
  const { label, error } = getDiscoverySharingStatus(agentStatus);

  if (label === "Sharing error") {
    return (
      <Tooltip content={error}>
        <span style={statusStyle}>
          <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
          {label}
        </span>
      </Tooltip>
    );
  }

  if (label === "Sharing") {
    return (
      <span style={statusStyle}>
        <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />
        {label}
      </span>
    );
  }

  return (
    <span style={statusStyle}>
      <TimesIcon />
      {label}
    </span>
  );
};

DiscoveryStatus.displayName = "DiscoveryStatus";

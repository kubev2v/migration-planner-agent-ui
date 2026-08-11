import { css } from "@emotion/css";
import type { AgentStatus } from "@openshift-migration-advisor/agent-sdk";
import { Flex, FlexItem, Tooltip } from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { getDiscoverySharingStatus } from "./formatDiscoveryStatus";

const dangerIconStyle = css`
  color: var(--pf-t--global--icon--color--status--danger--default);
`;

const successIconStyle = css`
  color: var(--pf-t--global--icon--color--status--success--default);
`;

interface DiscoveryStatusProps {
  agentStatus: AgentStatus | null | undefined;
}

export const DiscoveryStatus: React.FC<DiscoveryStatusProps> = ({
  agentStatus,
}) => {
  const { label, error } = getDiscoverySharingStatus(agentStatus);

  let statusContent: React.ReactNode;

  if (label === "Sharing error") {
    statusContent = (
      <Tooltip content={error}>
        <Flex columnGap={{ default: "columnGapXs" }}>
          <FlexItem>
            <ExclamationCircleIcon className={dangerIconStyle} />
          </FlexItem>
          <FlexItem>{label}</FlexItem>
        </Flex>
      </Tooltip>
    );
  } else if (label === "Sharing") {
    statusContent = (
      <Flex columnGap={{ default: "columnGapXs" }}>
        <FlexItem>
          <CheckCircleIcon className={successIconStyle} />
        </FlexItem>
        <FlexItem>{label}</FlexItem>
      </Flex>
    );
  } else {
    statusContent = (
      <Flex columnGap={{ default: "columnGapXs" }}>
        <FlexItem>
          <TimesIcon />
        </FlexItem>
        <FlexItem>{label}</FlexItem>
      </Flex>
    );
  }

  return (
    <Flex columnGap={{ default: "columnGapSm" }}>
      <FlexItem>Red Hat sharing status:</FlexItem>
      <FlexItem>{statusContent}</FlexItem>
    </Flex>
  );
};

DiscoveryStatus.displayName = "DiscoveryStatus";

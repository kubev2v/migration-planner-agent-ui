import { css } from "@emotion/css";
import {
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Tooltip,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesCircleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { formatReportRunDate } from "../pages/ReportComparison/comparisonFormatting";
import { useListCollectionsQuery } from "../store/api/comparisonEndpoints";
import { DataSharingAlert } from "./components/DataSharingAlert";
import { DataSharingModal } from "./components/DataSharingModal";
import {
  DATA_SHARING_ALERT_DISMISSED_KEY,
  DATA_SHARING_ALERT_DISMISSED_VERSION,
} from "./components/dataSharingAlertStorage";
import { RedHatSharingStatusPopover } from "./components/RedHatSharingStatusPopover";
import useLocalStorage from "./hooks/useLocalStorage";
import { useAgentStatus } from "./useAgentStatus";

const dangerIconStyle = css`
  color: var(--pf-t--global--icon--color--status--danger--default);
`;

const successIconStyle = css`
  color: var(--pf-t--global--icon--color--status--success--default);
`;

const notSharingIconStyle = css`
  color: var(--pf-t--global--icon--color--status--danger--default);
`;

export const DiscoveryStatus: React.FC = () => {
  const { data: collections } = useListCollectionsQuery();
  const latestReportRun = collections?.[0]?.createdAt;

  const {
    discoverySharingStatus,
    discoverySharingError,
    isDataShared,
    isRvtoolsMode,
    enableSharing,
  } = useAgentStatus();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharingAlertDismissed, setIsSharingAlertDismissed] = useLocalStorage(
    DATA_SHARING_ALERT_DISMISSED_KEY,
    false,
    DATA_SHARING_ALERT_DISMISSED_VERSION,
  );

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleShareConfirm = async () => {
    setIsShareLoading(true);
    setShareError(null);
    try {
      await enableSharing();
      setShareError(null);
      setIsShareModalOpen(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to enable data sharing. Please try again.";
      setShareError(errorMessage);
      console.error("Error changing agent mode:", err);
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleShareCancel = () => {
    setShareError(null);
    setIsShareModalOpen(false);
  };

  if (isRvtoolsMode) {
    return null;
  }

  let statusContent: React.ReactNode;

  if (discoverySharingStatus === "Sharing error") {
    statusContent = (
      <Tooltip content={discoverySharingError}>
        <Flex columnGap={{ default: "columnGapXs" }}>
          <FlexItem>
            <ExclamationCircleIcon className={dangerIconStyle} />
          </FlexItem>
          <FlexItem>{discoverySharingStatus}</FlexItem>
        </Flex>
      </Tooltip>
    );
  } else if (discoverySharingStatus === "Sharing") {
    statusContent = (
      <Flex
        columnGap={{ default: "columnGapXs" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <FlexItem>
          <CheckCircleIcon className={successIconStyle} />
        </FlexItem>
        <FlexItem>{discoverySharingStatus}</FlexItem>
      </Flex>
    );
  } else {
    statusContent = (
      <Flex
        columnGap={{ default: "columnGapXs" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <FlexItem>
          <TimesCircleIcon className={notSharingIconStyle} />
        </FlexItem>
        <FlexItem>{discoverySharingStatus}</FlexItem>
        <FlexItem>
          <RedHatSharingStatusPopover onShare={handleShareClick} />
        </FlexItem>
      </Flex>
    );
  }

  const showSharingAlert = !isDataShared && !isSharingAlertDismissed;

  return (
    <>
      <Stack hasGutter={showSharingAlert}>
        <StackItem>
          <Flex
            columnGap={{ default: "columnGapSm" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>Red Hat sharing status:</FlexItem>
            <FlexItem>{statusContent}</FlexItem>
          </Flex>
        </StackItem>
        {latestReportRun ? (
          <StackItem>
            <Content component="p">
              Latest run: {formatReportRunDate(latestReportRun)}
            </Content>
          </StackItem>
        ) : null}
        {showSharingAlert ? (
          <StackItem>
            <DataSharingAlert
              onShare={handleShareClick}
              onDismiss={() => setIsSharingAlertDismissed(true)}
            />
          </StackItem>
        ) : null}
      </Stack>
      <DataSharingModal
        isOpen={isShareModalOpen}
        onConfirm={handleShareConfirm}
        onCancel={handleShareCancel}
        isLoading={isShareLoading}
        error={shareError}
      />
    </>
  );
};

DiscoveryStatus.displayName = "DiscoveryStatus";

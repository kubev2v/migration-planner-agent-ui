import { css } from "@emotion/css";
import { useInjection } from "@openshift-migration-advisor/ioc";
import {
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Tooltip,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { DefaultApiInterface } from "../api/agentApi";
import { Symbols } from "../main/Symbols";
import { unwrapInventoryPayload } from "../pages/VirtualMachinesOverview/inventoryParsing";
import { DataSharingAlert } from "./components/DataSharingAlert";
import { DataSharingModal } from "./components/DataSharingModal";
import { useAgentStatus } from "./useAgentStatus";

const dangerIconStyle = css`
  color: var(--pf-t--global--icon--color--status--danger--default);
`;

const successIconStyle = css`
  color: var(--pf-t--global--icon--color--status--success--default);
`;

export const DiscoveryStatus: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const {
    discoverySharingStatus,
    discoverySharingError,
    isDataShared,
    enableSharing,
    fetchStatus,
  } = useAgentStatus();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDownloadInventory = useCallback(async () => {
    try {
      const response = await agentApi.getLatestInventory();
      const payload = unwrapInventoryPayload(response);
      const downloadData = payload
        ? {
            agentId: response.inventory?.agentId ?? "",
            inventory: payload,
          }
        : response;

      const jsonString = JSON.stringify(downloadData, null, 2);

      const blob = new Blob([jsonString], { type: "application/json" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-${new Date().toISOString().split("T")[0]}.json`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading inventory:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to download inventory. Please try again.";
      alert(errorMessage);
    }
  }, [agentApi]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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
      <Flex columnGap={{ default: "columnGapXs" }}>
        <FlexItem>
          <CheckCircleIcon className={successIconStyle} />
        </FlexItem>
        <FlexItem>{discoverySharingStatus}</FlexItem>
      </Flex>
    );
  } else {
    statusContent = (
      <Flex columnGap={{ default: "columnGapXs" }}>
        <FlexItem>
          <TimesIcon />
        </FlexItem>
        <FlexItem>{discoverySharingStatus}</FlexItem>
      </Flex>
    );
  }

  return (
    <>
      <Stack hasGutter={!isDataShared}>
        <StackItem>
          <Flex columnGap={{ default: "columnGapSm" }}>
            <FlexItem>Red Hat sharing status:</FlexItem>
            <FlexItem>{statusContent}</FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          {!isDataShared && (
            <DataSharingAlert
              onShare={handleShareClick}
              onDownloadInventory={handleDownloadInventory}
            />
          )}
        </StackItem>
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

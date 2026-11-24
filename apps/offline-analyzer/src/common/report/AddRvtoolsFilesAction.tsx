import type { CollectorStatus } from "@openshift-migration-advisor/offline-analyzer-sdk";
import {
  AddRvtoolsFilesButton,
  MAX_RVTOOLS_FILES,
} from "@openshift-migration-advisor/shared-components";
import type React from "react";
import { useState } from "react";
import { getAgentApiClient } from "../../api/agentApiClient";
import { getCollectionProgressInfo } from "../../common/collectionProgress";
import { parseApiError } from "../../common/parseApiError";
import { agentApiSlice } from "../../store/api/agentApiSlice";
import { useUpdateRvtoolsCollectorMutation } from "../../store/api/lifecycleEndpoints";
import { useAppDispatch } from "../../store/hooks";

const POLL_INTERVAL_MS = 1500;
const COLLECTION_TIMEOUT_MS = POLL_INTERVAL_MS * 200;

interface AddRvtoolsFilesActionProps {
  onUploadSuccess?: () => void;
}

export const AddRvtoolsFilesAction: React.FC<AddRvtoolsFilesActionProps> = ({
  onUploadSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [updateRvtoolsCollector, { isLoading: isStarting }] =
    useUpdateRvtoolsCollectorMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [collectorStatus, setCollectorStatus] =
    useState<CollectorStatus | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isStarting || isCollecting;
  const progressInfo = getCollectionProgressInfo(
    collectorStatus?.status,
    error,
  );

  const openModal = (): void => {
    setError(null);
    setCollectorStatus(null);
    setIsOpen(true);
  };

  const closeModal = (): void => {
    if (isBusy) {
      return;
    }
    setIsOpen(false);
    setError(null);
    setCollectorStatus(null);
  };

  const handleCollectionComplete = (): void => {
    dispatch(
      agentApiSlice.util.invalidateTags([
        "Collections",
        "Vms",
        "Inventory",
        "VmLabels",
        "CollectorStatus",
      ]),
    );
    setIsCollecting(false);
    setIsOpen(false);
    setError(null);
    setCollectorStatus(null);
    onUploadSuccess?.();
  };

  const waitForCollection = async (): Promise<CollectorStatus> => {
    const deadline = Date.now() + COLLECTION_TIMEOUT_MS;
    const agentApi = getAgentApiClient();

    while (Date.now() < deadline) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, POLL_INTERVAL_MS);
      });
      const status = await agentApi.getCollectorStatus();
      setCollectorStatus(status);
      if (status.status === "collected" || status.status === "error") {
        return status;
      }
    }

    throw new Error(
      "Timed out while waiting for the RVTools update to finish.",
    );
  };

  const handleSubmit = async (files: File[]): Promise<void> => {
    if (files.length === 0) {
      return;
    }

    setError(null);

    try {
      const initialStatus = await updateRvtoolsCollector({ files }).unwrap();
      setCollectorStatus(initialStatus);

      if (initialStatus.status === "error") {
        setError(initialStatus.error ?? "The RVTools update failed.");
        return;
      }
      if (initialStatus.status === "collected") {
        handleCollectionComplete();
        return;
      }

      setIsCollecting(true);
      const finalStatus = await waitForCollection();
      setIsCollecting(false);

      if (finalStatus.status === "collected") {
        handleCollectionComplete();
      } else {
        setError(finalStatus.error ?? "The RVTools update failed.");
      }
    } catch (err) {
      setIsCollecting(false);
      const message = await parseApiError(
        err,
        "Failed to add RVTools files to the report.",
      );
      setError(message);
    }
  };

  return (
    <AddRvtoolsFilesButton
      isOpen={isOpen}
      onOpen={openModal}
      onClose={closeModal}
      onSubmit={(files) => void handleSubmit(files)}
      maxFiles={MAX_RVTOOLS_FILES}
      isLoading={isStarting}
      isProcessing={isCollecting}
      error={error}
      progress={
        isBusy
          ? {
              percentage: progressInfo.percentage,
              statusText:
                progressInfo.statusText || "Processing RVTools files...",
            }
          : null
      }
    />
  );
};

AddRvtoolsFilesAction.displayName = "AddRvtoolsFilesAction";

import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Backdrop,
  Bullseye,
  Button,
  Content,
  Divider,
  type DropEvent,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatus,
  MultipleFileUploadStatusItem,
  Title,
} from "@patternfly/react-core";
import { UploadIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCollectionProgressInfo } from "../../common/collectionProgress";
import { CollectionProgress, RedHatLogo } from "../../common/components/index";
import { agentApiSlice } from "../../store/api/agentApiSlice";
import {
  useGetCollectorStatusQuery,
  useStartRvtoolsCollectorMutation,
} from "../../store/api/lifecycleEndpoints";
import { getSdkErrorMessage } from "../../store/baseQuery";
import { useAppDispatch } from "../../store/hooks";

const ACCEPTED_EXTENSION = ".xlsx";
const ACCEPTED_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const POLL_INTERVAL_MS = 1500;
const COLLECTION_TIMEOUT_MS = POLL_INTERVAL_MS * 200; // ~5 minutes

type CollectorStatusValue = CollectorStatus["status"];

const IN_PROGRESS_STATUSES: CollectorStatusValue[] = [
  "connecting",
  "collecting",
  "collecting metrics",
  "parsing",
];

export const RVToolsUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const goToReport = useCallback((): void => {
    dispatch(agentApiSlice.util.invalidateTags(["Collections"]));
    navigate("/report");
  }, [dispatch, navigate]);

  const [files, setFiles] = useState<File[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [startedStatus, setStartedStatus] =
    useState<CollectorStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [startRvtoolsCollector, { isLoading: isStarting }] =
    useStartRvtoolsCollectorMutation();

  const { data: collectorStatus } = useGetCollectorStatusQuery(undefined, {
    pollingInterval: isCollecting ? POLL_INTERVAL_MS : 0,
  });

  useEffect(() => {
    document.title = "Migration Advisor";
  }, []);

  useEffect(() => {
    if (isCollecting || !collectorStatus) {
      return;
    }
    if (IN_PROGRESS_STATUSES.includes(collectorStatus.status)) {
      setIsCollecting(true);
    }
  }, [isCollecting, collectorStatus]);

  useEffect(() => {
    if (!isCollecting) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setIsCollecting(false);
      setError("Timed out while waiting for the RVTools collection to finish.");
    }, COLLECTION_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isCollecting]);

  const status = collectorStatus?.status ?? startedStatus;
  const progressInfo = getCollectionProgressInfo(status ?? null, error);
  const isBusy = isStarting || isCollecting;

  useEffect(() => {
    if (!isCollecting || !collectorStatus) {
      return;
    }

    if (collectorStatus.status === "collected") {
      setIsCollecting(false);
      goToReport();
      return;
    }

    if (collectorStatus.status === "error") {
      setIsCollecting(false);
      setError(collectorStatus.error ?? "The RVTools collection failed.");
    }
  }, [isCollecting, collectorStatus, goToReport]);

  const handleFileDrop = useCallback(
    (_event: DropEvent, droppedFiles: File[]): void => {
      setError(null);
      const accepted = droppedFiles.filter((file) =>
        file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION),
      );
      setFiles((current) => {
        const byName = new Map(current.map((file) => [file.name, file]));
        for (const file of accepted) {
          byName.set(file.name, file);
        }
        return Array.from(byName.values());
      });
    },
    [],
  );

  const handleRemoveFile = useCallback((name: string): void => {
    setFiles((current) => current.filter((file) => file.name !== name));
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (files.length === 0) {
      return;
    }

    setError(null);

    try {
      const initialStatus = await startRvtoolsCollector({ files }).unwrap();
      setStartedStatus(initialStatus.status);

      if (initialStatus.status === "error") {
        setError(initialStatus.error ?? "The RVTools collection failed.");
        return;
      }
      if (initialStatus.status === "collected") {
        goToReport();
        return;
      }

      setIsCollecting(true);
    } catch (err) {
      setError(getSdkErrorMessage(err, "Failed to process the RVTools file."));
      setStartedStatus(null);
    }
  };

  return (
    <Backdrop style={{ overflow: "auto" }}>
      <Bullseye style={{ height: "100vh", padding: "1rem" }}>
        <Modal
          isOpen={true}
          variant="medium"
          aria-labelledby="rvtools-upload-modal-title"
        >
          <ModalBody>
            <Flex direction={{ default: "column" }} gap={{ default: "gapMd" }}>
              <FlexItem>
                <RedHatLogo />
              </FlexItem>

              <FlexItem>
                <Title
                  headingLevel="h1"
                  size="2xl"
                  id="rvtools-upload-modal-title"
                >
                  Migration Advisor Agent
                </Title>
              </FlexItem>

              <FlexItem>
                <Content component="p">
                  Upload one or more RVTools exports to analyze your VMware
                  environment offline. The RVTools spreadsheet already contains
                  your VM inventory, storage configuration, and network
                  topology, so no connection to vCenter or the Red Hat console
                  is required. Once processed, you get migration recommendations
                  for OpenShift Virtualization.
                </Content>
              </FlexItem>

              <Divider />

              <FlexItem>
                <Title headingLevel="h2" size="lg">
                  RVTools files
                </Title>
              </FlexItem>

              {error && (
                <FlexItem>
                  <Alert variant="danger" isInline title="Upload failed">
                    {error}
                  </Alert>
                </FlexItem>
              )}

              <FlexItem>
                <MultipleFileUpload
                  onFileDrop={handleFileDrop}
                  dropzoneProps={{
                    accept: { [ACCEPTED_MIME]: [ACCEPTED_EXTENSION] },
                    disabled: isBusy,
                  }}
                >
                  <MultipleFileUploadMain
                    titleIcon={<UploadIcon />}
                    titleText="Drag and drop files here"
                    titleTextSeparator="or"
                    infoText="Accepted file type: .xlsx"
                    browseButtonText="Upload"
                  />
                  {files.length > 0 && (
                    <MultipleFileUploadStatus
                      statusToggleText={`${files.length} file${
                        files.length === 1 ? "" : "s"
                      } selected`}
                    >
                      {files.map((file) => (
                        <MultipleFileUploadStatusItem
                          key={file.name}
                          file={file}
                          onClearClick={() => handleRemoveFile(file.name)}
                          buttonAriaLabel={`Remove ${file.name}`}
                        />
                      ))}
                    </MultipleFileUploadStatus>
                  )}
                </MultipleFileUpload>
              </FlexItem>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="primary"
              onClick={() => void handleSubmit()}
              isLoading={isBusy}
              isDisabled={isBusy || files.length === 0}
            >
              Create assessment report
            </Button>
            {isBusy && (
              <CollectionProgress
                percentage={progressInfo.percentage}
                statusText={progressInfo.statusText}
              />
            )}
          </ModalFooter>
        </Modal>
      </Bullseye>
    </Backdrop>
  );
};

RVToolsUploadPage.displayName = "RVToolsUploadPage";

export default RVToolsUploadPage;

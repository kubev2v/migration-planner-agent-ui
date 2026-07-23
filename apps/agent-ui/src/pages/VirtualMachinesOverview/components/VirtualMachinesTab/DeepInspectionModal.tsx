import { css } from "@emotion/css";
import type {
  DefaultApiInterface,
  InspectorStatus,
  VddkProperties,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Button,
  Content,
  FileUpload,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Title,
} from "@patternfly/react-core";
import {
  AngleRightIcon,
  CheckCircleIcon,
  InfoCircleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TechnologyPreviewBadge } from "../../../../common/components/TechnologyPreviewBadge";
import {
  buildStartInspectionVmIds,
  MAX_INSPECTION_VMS,
} from "./vmInspectionUtils";
import { fetchVmIdsUnderInspection } from "./vmSelection";

interface DeepInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVMIds: string[];
  knownVmsForInspection?: VirtualMachine[];
  agentApi: DefaultApiInterface;
  onInspectionStarted: () => void;
  onInspectionQueueChanged?: () => void;
}

type InspectorRunningState = "running" | "ready" | "unknown";

type SectionStatus = "notConfigured" | "configured" | "error";

const modalStyles = {
  section: css`
    border: 1px solid var(--pf-t--global--border--color--default);
    border-radius: var(--pf-t--global--border--radius--small);
    overflow: hidden;
  `,
  sectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
    gap: 12px;

    &:hover {
      background: var(--pf-t--global--background--color--secondary--default);
    }
  `,
  sectionHeaderLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  `,
  sectionHeaderRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  `,
  sectionTitle: css`
    display: flex;
    flex-direction: column;
  `,
  sectionBody: css`
    padding: 0 20px 20px 20px;
  `,
  statusConfigured: css`
    color: var(--pf-t--global--icon--color--status--success--default);
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  statusNotConfigured: css`
    color: var(--pf-t--global--text--color--subtle);
    display: flex;
    align-items: center;
    gap: 6px;
  `,
};

export const DeepInspectionModal: React.FC<DeepInspectionModalProps> = ({
  isOpen,
  onClose,
  selectedVMIds,
  knownVmsForInspection = [],
  agentApi,
  onInspectionStarted,
  onInspectionQueueChanged,
}) => {
  // Section expand/collapse
  const [vddkExpanded, setVddkExpanded] = useState(true);

  // VDDK state
  const [vddkFile, setVddkFile] = useState<File | null>(null);
  const [vddkFileName, setVddkFileName] = useState("");
  const [vddkUploading, setVddkUploading] = useState(false);
  const [vddkStatus, setVddkStatus] = useState<SectionStatus>("notConfigured");
  const [vddkError, setVddkError] = useState<string | null>(null);
  const [vddkProps, setVddkProps] = useState<VddkProperties | null>(null);

  // Global state
  const [configuring, setConfiguring] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [existingInspectionVmIds, setExistingInspectionVmIds] = useState<
    string[]
  >([]);
  const [inspectorRunning, setInspectorRunning] = useState(false);
  const [inspectionContextError, setInspectionContextError] = useState<
    string | null
  >(null);
  const [loadingInspectionContext, setLoadingInspectionContext] =
    useState(false);

  const extractErrorMessage = async (
    err: unknown,
    fallback: string,
  ): Promise<string> => {
    if (err instanceof ResponseError) {
      try {
        const body = await err.response.json();
        if (body?.error) return body.error;
      } catch {
        // response body not parseable
      }
    }
    return err instanceof Error ? err.message : fallback;
  };

  const fetchExistingStatus = useCallback(async () => {
    try {
      const status: InspectorStatus = await agentApi.getInspectorStatus({
        includeVddk: true,
      });

      if (status.vddk) {
        setVddkStatus("configured");
        setVddkProps(status.vddk);
        setVddkExpanded(false);
      }
    } catch (err) {
      const isExpectedNotConfigured =
        err instanceof ResponseError &&
        (err.response?.status === 404 || err.response?.status === 400);
      if (!isExpectedNotConfigured) {
        console.error("Error fetching inspector status:", err);
      }
    }
  }, [agentApi]);

  const getInspectorRunningState =
    useCallback(async (): Promise<InspectorRunningState> => {
      try {
        const status = await agentApi.getInspectorStatus({});
        return status.state === "running" ? "running" : "ready";
      } catch (err) {
        console.error("Error checking inspector status:", err);
        return "unknown";
      }
    }, [agentApi]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const loadModalContext = async () => {
      setLoadingInspectionContext(true);
      setInspectionContextError(null);
      try {
        await fetchExistingStatus();

        const runningState = await getInspectorRunningState();
        if (cancelled) {
          return;
        }

        const running = runningState === "running";
        setInspectorRunning(running);

        if (running) {
          const vmIdsUnderInspection = await fetchVmIdsUnderInspection(
            agentApi,
            knownVmsForInspection,
          );
          if (cancelled) {
            return;
          }
          if (vmIdsUnderInspection.length === 0) {
            setExistingInspectionVmIds([]);
            setInspectionContextError(
              "Unable to load VMs currently under deep inspection. Refresh the table and try again.",
            );
          } else {
            setExistingInspectionVmIds(vmIdsUnderInspection);
          }
        } else {
          setExistingInspectionVmIds([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading deep inspection context:", err);
          setExistingInspectionVmIds([]);
          setInspectorRunning(false);
          setInspectionContextError(
            "Unable to load deep inspection status. Try again in a moment.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingInspectionContext(false);
        }
      }
    };

    void loadModalContext();

    return () => {
      cancelled = true;
    };
  }, [
    agentApi,
    fetchExistingStatus,
    getInspectorRunningState,
    isOpen,
    knownVmsForInspection,
  ]);

  const resetState = () => {
    setVddkFile(null);
    setVddkFileName("");
    setVddkUploading(false);
    setVddkStatus("notConfigured");
    setVddkError(null);
    setVddkProps(null);
    setConfiguring(false);
    setGlobalError(null);
    setVddkExpanded(true);
    setExistingInspectionVmIds([]);
    setInspectorRunning(false);
    setInspectionContextError(null);
    setLoadingInspectionContext(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleVddkFileChange = (
    _event: React.ChangeEvent | React.DragEvent,
    file: File,
  ) => {
    setVddkFile(file);
    setVddkFileName(file.name);
    setVddkError(null);
    setVddkStatus("notConfigured");
  };

  const handleVddkClear = () => {
    setVddkFile(null);
    setVddkFileName("");
    setVddkError(null);
    setVddkStatus("notConfigured");
    setVddkProps(null);
  };

  const handleVddkUpload = async () => {
    if (!vddkFile) return;

    setVddkUploading(true);
    setVddkError(null);

    try {
      const props = await agentApi.putInspectorVddk({ file: vddkFile });
      setVddkProps(props);
      setVddkStatus("configured");
      setVddkExpanded(false);
    } catch (err) {
      const message = await extractErrorMessage(err, "Failed to upload VDDK");
      setVddkError(message);
      setVddkStatus("error");
    } finally {
      setVddkUploading(false);
    }
  };

  const hasVMsSelected = selectedVMIds.length > 0;
  const addingToExistingInspection = inspectorRunning;
  const startInspectionVmIds = useMemo(
    () =>
      hasVMsSelected
        ? buildStartInspectionVmIds(selectedVMIds, existingInspectionVmIds)
        : [],
    [existingInspectionVmIds, hasVMsSelected, selectedVMIds],
  );
  const tooManyVMs = startInspectionVmIds.length > MAX_INSPECTION_VMS;

  const canConfigure =
    vddkStatus === "configured" &&
    !loadingInspectionContext &&
    !inspectionContextError &&
    (!hasVMsSelected || !tooManyVMs);

  const waitForInspectorReady = useCallback(async (): Promise<boolean> => {
    const MAX_WAIT_ATTEMPTS = 10;
    const POLL_INTERVAL_MS = 500;
    for (let i = 0; i < MAX_WAIT_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const state = await getInspectorRunningState();
      if (state === "ready") {
        return true;
      }
      if (state === "unknown") {
        return false;
      }
    }
    return (await getInspectorRunningState()) === "ready";
  }, [getInspectorRunningState]);

  const resolveVmIdsUnderInspection = useCallback(async (): Promise<
    string[] | null
  > => {
    if (existingInspectionVmIds.length > 0) {
      return existingInspectionVmIds;
    }
    const vmIdsUnderInspection = await fetchVmIdsUnderInspection(
      agentApi,
      knownVmsForInspection,
    );
    return vmIdsUnderInspection.length > 0 ? vmIdsUnderInspection : null;
  }, [agentApi, existingInspectionVmIds, knownVmsForInspection]);

  const handleConfigure = async () => {
    // When no VMs are selected the user is only updating the configuration
    // (VDDK / credentials). Both are already persisted by their own actions,
    // so there is nothing left to do — just close the modal.
    if (!hasVMsSelected) {
      handleClose();
      return;
    }

    setConfiguring(true);
    setGlobalError(null);

    let stoppedForAdd = false;
    try {
      let vmIds = selectedVMIds;
      const inspectorState = await getInspectorRunningState();
      if (inspectorState === "unknown") {
        setGlobalError(
          "Unable to verify deep inspection status. Try again in a moment.",
        );
        return;
      }

      if (inspectorState === "running") {
        const vmIdsUnderInspection = await resolveVmIdsUnderInspection();
        if (!vmIdsUnderInspection) {
          setGlobalError(
            "Unable to determine which VMs are currently under deep inspection. Refresh the table and try again.",
          );
          return;
        }
        vmIds = buildStartInspectionVmIds(selectedVMIds, vmIdsUnderInspection);
        await agentApi.stopInspection();
        stoppedForAdd = true;
        onInspectionQueueChanged?.();

        const inspectorReady = await waitForInspectorReady();
        if (!inspectorReady) {
          setGlobalError(
            "The inspector did not stop in time. Refresh the table, confirm the current run status, and try again.",
          );
          return;
        }
      }

      await agentApi.startInspection({
        startInspectionRequest: {
          vmIds,
        },
      });
      onInspectionStarted();
      handleClose();
    } catch (err) {
      const message = await extractErrorMessage(
        err,
        "Failed to start deep inspection",
      );
      if (stoppedForAdd) {
        onInspectionQueueChanged?.();
        setGlobalError(
          `${message} The previous deep inspection run was stopped. Select all affected VMs and start inspection again.`,
        );
      } else {
        setGlobalError(message);
      }
    } finally {
      setConfiguring(false);
    }
  };

  const renderSectionStatus = (status: SectionStatus) => {
    if (status === "configured") {
      return (
        <span className={modalStyles.statusConfigured}>
          <CheckCircleIcon /> Configured
        </span>
      );
    }
    return (
      <span className={modalStyles.statusNotConfigured}>Not configured</span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      aria-labelledby="deep-inspection-modal-title"
      aria-describedby="deep-inspection-modal-body"
      variant="medium"
    >
      <ModalHeader>
        {/* Use children instead of title for the tech preview badge popover */}
        <Flex>
          <FlexItem>
            <Title headingLevel="h2">Set up deep inspection</Title>
          </FlexItem>
          <FlexItem>
            <Content component="p">
              <TechnologyPreviewBadge />
            </Content>
          </FlexItem>
        </Flex>
      </ModalHeader>
      <ModalBody id="deep-inspection-modal-body">
        <Content component="p">
          Deep Inspection analyzes a VM&apos;s internal configuration through a
          granular, disk-level scan.
          <br />
          {hasVMsSelected
            ? addingToExistingInspection
              ? `Add ${selectedVMIds.length} VM${selectedVMIds.length !== 1 ? "s" : ""} to the deep inspection already in progress.`
              : `Configure deep inspection for ${selectedVMIds.length} selected VM${selectedVMIds.length !== 1 ? "s" : ""}.`
            : "Update the VDDK archive and credentials for deep inspection"}
        </Content>

        {addingToExistingInspection && hasVMsSelected && (
          <Alert
            variant="warning"
            title="Adding VMs restarts the inspection queue"
            isInline
            style={{ marginBottom: "16px" }}
          >
            The inspector stops briefly and restarts with the existing queue
            plus the newly selected VMs. A VM currently being scanned may start
            over from the beginning.
          </Alert>
        )}

        {tooManyVMs && (
          <Alert
            variant="warning"
            title={`Deep inspection can be run on up to ${MAX_INSPECTION_VMS} VMs at a time.`}
            isInline
            style={{ marginBottom: "16px" }}
          >
            {addingToExistingInspection
              ? `This inspection already includes ${existingInspectionVmIds.length} VM${existingInspectionVmIds.length !== 1 ? "s" : ""}. Adding the selected VM${selectedVMIds.length !== 1 ? "s" : ""} would exceed the limit (${startInspectionVmIds.length} total).`
              : `You have selected ${selectedVMIds.length} VMs.`}
          </Alert>
        )}

        {inspectionContextError && (
          <Alert
            variant="danger"
            title="Unable to load inspection status"
            isInline
            style={{ marginBottom: "16px" }}
          >
            {inspectionContextError}
          </Alert>
        )}

        {globalError && (
          <Alert
            variant="danger"
            title="Error"
            isInline
            style={{ marginBottom: "16px" }}
          >
            {globalError}
          </Alert>
        )}

        {/* VDDK Configuration Section */}
        <div className={modalStyles.section}>
          <button
            type="button"
            className={modalStyles.sectionHeader}
            onClick={() => setVddkExpanded(!vddkExpanded)}
          >
            <div className={modalStyles.sectionHeaderLeft}>
              <Icon>
                <InfoCircleIcon color="var(--pf-t--global--icon--color--status--info--default)" />
              </Icon>
              <div className={modalStyles.sectionTitle}>
                <strong>VDDK configuration</strong>
                <Content component="small">Upload a VDDK archive</Content>
              </div>
            </div>
            <div className={modalStyles.sectionHeaderRight}>
              {renderSectionStatus(vddkStatus)}
              <AngleRightIcon
                style={{
                  transition: "transform 0.2s",
                  transform: vddkExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
            </div>
          </button>

          {vddkExpanded && (
            <div className={modalStyles.sectionBody}>
              {vddkError && (
                <Alert
                  variant="danger"
                  title="Upload failed"
                  isInline
                  style={{ marginBottom: "12px" }}
                >
                  {vddkError}
                </Alert>
              )}

              <Form>
                <FormGroup
                  label="VDDK package file"
                  isRequired
                  fieldId="vddk-file"
                >
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        icon={<InfoCircleIcon />}
                        variant="indeterminate"
                      >
                        Upload a VMware VDDK .tar.gz archive (max 64 MB)
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "flex-start",
                    }}
                  >
                    <FileUpload
                      id="vddk-file-upload"
                      value={vddkFile ?? undefined}
                      filename={vddkFileName}
                      onFileInputChange={(_ev, file) =>
                        handleVddkFileChange(_ev as React.ChangeEvent, file)
                      }
                      onClearClick={handleVddkClear}
                      browseButtonText="Upload"
                      isLoading={vddkUploading}
                      isDisabled={vddkUploading}
                      accept=".tar.gz,.tgz"
                      style={{ flex: 1 }}
                    />
                  </div>
                  {vddkProps && (
                    <HelperText>
                      <HelperTextItem>
                        Selected: {vddkFileName || `VDDK v${vddkProps.version}`}{" "}
                        ({((vddkProps.bytes || 0) / (1024 * 1024)).toFixed(2)}{" "}
                        MB)
                      </HelperTextItem>
                    </HelperText>
                  )}
                </FormGroup>
              </Form>
              {vddkFile && vddkStatus !== "configured" && (
                <Button
                  variant="secondary"
                  onClick={handleVddkUpload}
                  isLoading={vddkUploading}
                  isDisabled={vddkUploading}
                  style={{ marginTop: "12px" }}
                >
                  Upload VDDK
                </Button>
              )}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleConfigure}
          isLoading={configuring || loadingInspectionContext}
          isDisabled={!canConfigure || configuring || loadingInspectionContext}
        >
          {hasVMsSelected
            ? addingToExistingInspection
              ? "Add to inspection"
              : "Configure"
            : "Save configuration"}
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={configuring}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

DeepInspectionModal.displayName = "DeepInspectionModal";

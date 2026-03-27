import { css } from "@emotion/css";
import type {
  DefaultApiInterface,
  InspectorStatus,
  VddkProperties,
} from "@openshift-migration-advisor/agent-sdk";
import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Button,
  Content,
  FileUpload,
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
  TextInput,
} from "@patternfly/react-core";
import { CheckCircleIcon, InfoCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface DeepInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVMIds: string[];
  agentApi: DefaultApiInterface;
  onInspectionStarted: () => void;
}

type SectionStatus = "notConfigured" | "configured" | "error";

const modalStyles = {
  section: css`
    border: 1px solid var(--pf-t--global--border--color--default);
    border-radius: var(--pf-t--global--border--radius--small);
    margin-bottom: 16px;
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
  agentApi,
  onInspectionStarted,
}) => {
  // Section expand/collapse
  const [vddkExpanded, setVddkExpanded] = useState(true);
  const [credentialsExpanded, setCredentialsExpanded] = useState(true);

  // VDDK state
  const [vddkFile, setVddkFile] = useState<File | null>(null);
  const [vddkFileName, setVddkFileName] = useState("");
  const [vddkUploading, setVddkUploading] = useState(false);
  const [vddkStatus, setVddkStatus] = useState<SectionStatus>("notConfigured");
  const [vddkError, setVddkError] = useState<string | null>(null);
  const [vddkProps, setVddkProps] = useState<VddkProperties | null>(null);

  // Credentials state
  const [vcenterUrl, setVcenterUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [credentialsStatus, setCredentialsStatus] =
    useState<SectionStatus>("notConfigured");
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  // Global state
  const [configuring, setConfiguring] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fetchExistingStatus = useCallback(async () => {
    try {
      const status: InspectorStatus = await agentApi.getInspectorStatus({
        includeVddk: true,
        includeCredentials: true,
      });

      if (status.vddk) {
        setVddkStatus("configured");
        setVddkProps(status.vddk);
      }

      if (status.credentials) {
        setCredentialsStatus("configured");
        setVcenterUrl(status.credentials.url || "");
        setUsername(status.credentials.username || "");
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

  useEffect(() => {
    if (isOpen) {
      fetchExistingStatus();
    }
  }, [isOpen, fetchExistingStatus]);

  const resetState = () => {
    setVddkFile(null);
    setVddkFileName("");
    setVddkUploading(false);
    setVddkStatus("notConfigured");
    setVddkError(null);
    setVddkProps(null);
    setVcenterUrl("");
    setUsername("");
    setPassword("");
    setCredentialsStatus("notConfigured");
    setCredentialsSaving(false);
    setCredentialsError(null);
    setConfiguring(false);
    setGlobalError(null);
    setVddkExpanded(true);
    setCredentialsExpanded(true);
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
  };

  const handleVddkClear = () => {
    setVddkFile(null);
    setVddkFileName("");
    setVddkError(null);
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
      const message =
        err instanceof Error ? err.message : "Failed to upload VDDK";
      setVddkError(message);
      setVddkStatus("error");
    } finally {
      setVddkUploading(false);
    }
  };

  const handleCredentialsSave = async () => {
    if (!vcenterUrl || !username || !password) return;

    setCredentialsSaving(true);
    setCredentialsError(null);

    try {
      await agentApi.putInspectorCredentials({
        vcenterCredentials: {
          url: vcenterUrl,
          username,
          password,
        },
      });
      setCredentialsStatus("configured");
      setCredentialsExpanded(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to validate credentials";
      setCredentialsError(message);
      setCredentialsStatus("error");
    } finally {
      setCredentialsSaving(false);
    }
  };

  const canConfigure =
    vddkStatus === "configured" && credentialsStatus === "configured";

  const handleConfigure = async () => {
    setConfiguring(true);
    setGlobalError(null);

    try {
      await agentApi.startInspection({
        startInspectionRequest: { vmIds: selectedVMIds },
      });
      onInspectionStarted();
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start deep inspection";
      setGlobalError(message);
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
      <ModalHeader
        title="Set up deep inspection"
        labelId="deep-inspection-modal-title"
        description={`Configure deep inspection for ${selectedVMIds.length} selected VM${selectedVMIds.length !== 1 ? "s" : ""}`}
      />
      <ModalBody id="deep-inspection-modal-body">
        <Content component="p" style={{ marginBottom: "24px" }}>
          Deep Inspection analyzes a VM&apos;s internal configuration through a
          granular, disk-level scan.
        </Content>

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
              <span>{vddkExpanded ? "∨" : "›"}</span>
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

        {/* Credentials Section */}
        <div className={modalStyles.section}>
          <button
            type="button"
            className={modalStyles.sectionHeader}
            onClick={() => setCredentialsExpanded(!credentialsExpanded)}
          >
            <div className={modalStyles.sectionHeaderLeft}>
              <Icon>
                <InfoCircleIcon color="var(--pf-t--global--icon--color--status--info--default)" />
              </Icon>
              <div className={modalStyles.sectionTitle}>
                <strong>Credentials</strong>
                <Content component="small">
                  Provide vCenter credentials for deep inspection
                </Content>
              </div>
            </div>
            <div className={modalStyles.sectionHeaderRight}>
              {renderSectionStatus(credentialsStatus)}
              <span>{credentialsExpanded ? "∨" : "›"}</span>
            </div>
          </button>

          {credentialsExpanded && (
            <div className={modalStyles.sectionBody}>
              {credentialsError && (
                <Alert
                  variant="danger"
                  title="Credentials error"
                  isInline
                  style={{ marginBottom: "12px" }}
                >
                  {credentialsError}
                </Alert>
              )}

              <Form>
                <FormGroup
                  label="vCenter server"
                  isRequired
                  fieldId="vcenter-url"
                >
                  <TextInput
                    id="vcenter-url"
                    value={vcenterUrl}
                    onChange={(_ev, val) => setVcenterUrl(val)}
                    placeholder="vcenter.example.com"
                    isDisabled={credentialsSaving}
                  />
                </FormGroup>
                <FormGroup label="Username" isRequired fieldId="vcenter-user">
                  <TextInput
                    id="vcenter-user"
                    value={username}
                    onChange={(_ev, val) => setUsername(val)}
                    placeholder="administrator@vsphere.local"
                    isDisabled={credentialsSaving}
                  />
                </FormGroup>
                <FormGroup label="Password" isRequired fieldId="vcenter-pass">
                  <TextInput
                    id="vcenter-pass"
                    type="password"
                    value={password}
                    onChange={(_ev, val) => setPassword(val)}
                    isDisabled={credentialsSaving}
                  />
                </FormGroup>
              </Form>
              {credentialsStatus !== "configured" && (
                <Button
                  variant="secondary"
                  onClick={handleCredentialsSave}
                  isLoading={credentialsSaving}
                  isDisabled={
                    credentialsSaving || !vcenterUrl || !username || !password
                  }
                  style={{ marginTop: "12px" }}
                >
                  Validate credentials
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
          isLoading={configuring}
          isDisabled={!canConfigure || configuring}
        >
          Configure
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={configuring}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

DeepInspectionModal.displayName = "DeepInspectionModal";

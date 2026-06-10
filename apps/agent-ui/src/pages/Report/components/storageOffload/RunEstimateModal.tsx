import {
  Button,
  Content,
  Flex,
  FlexItem,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import {
  AngleRightIcon,
  CheckCircleIcon,
  InfoCircleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import type {
  DatastoreGroup,
  ForecasterCredentials,
  ForecasterDatastore,
  SelectedPair,
} from "../forecasterTypes";
import { TechnologyPreviewBadge } from "../TechnologyPreviewBadge";
import { CredentialsForm } from "./CredentialsForm";
import { SelectPairsForm } from "./SelectPairsForm";
import { setupModalStyles } from "./setupModalStyles";
import { isCompletePair } from "./storageOffloadUtils";

export type SetupDraft = { pairs: SelectedPair[]; vmAcknowledged: boolean };

export interface RunEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: ForecasterCredentials;
  onCredentialsChange: (c: ForecasterCredentials) => void;
  credentialsSubmitted: boolean;
  credError: string | null;
  credMissingPrivileges: string[];
  credLoading: boolean;
  credAcknowledged: boolean;
  onCredAcknowledgedChange: (checked: boolean) => void;
  onSubmitCredentials: () => void;
  draft: SetupDraft;
  onDraftChange: (draft: SetupDraft) => void;
  datastores: ForecasterDatastore[];
  groups: DatastoreGroup[];
  dsLoading: boolean;
  dsError: string | null;
  pairCapsMap: Record<string, string[] | null>;
  capsLoading: boolean;
  hasNoCaps: boolean;
  onRun: () => void;
  canRun: boolean;
  runLoading: boolean;
}

export const RunEstimateModal: React.FC<RunEstimateModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onCredentialsChange,
  credentialsSubmitted,
  credError,
  credMissingPrivileges,
  credLoading,
  credAcknowledged,
  onCredAcknowledgedChange,
  onSubmitCredentials,
  draft,
  onDraftChange,
  datastores,
  groups,
  dsLoading,
  dsError,
  pairCapsMap,
  capsLoading,
  hasNoCaps,
  onRun,
  canRun,
  runLoading,
}) => {
  const [credExpanded, setCredExpanded] = useState(!credentialsSubmitted);
  const [pairsExpanded, setPairsExpanded] = useState(credentialsSubmitted);

  useEffect(() => {
    if (isOpen) {
      setCredExpanded(!credentialsSubmitted);
      setPairsExpanded(credentialsSubmitted);
    }
  }, [isOpen, credentialsSubmitted]);

  const canSubmitCredentials =
    !!credentials.url &&
    !!credentials.username &&
    !!credentials.password &&
    credAcknowledged;

  const pairsReady =
    credentialsSubmitted &&
    draft.pairs.some(isCompletePair) &&
    !hasNoCaps &&
    draft.vmAcknowledged;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="run-estimate-modal-title"
      variant="large"
    >
      <ModalHeader
        title={
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapSm" }}
          >
            <FlexItem>Run storage offload estimate</FlexItem>
            <FlexItem>
              <TechnologyPreviewBadge />
            </FlexItem>
          </Flex>
        }
        labelId="run-estimate-modal-title"
      />
      <ModalBody>
        <Content component="p" style={{ marginBottom: "20px" }}>
          Connect to vCenter, choose datastore pairs, then run the estimate.
          Results appear on the main page when the benchmark starts.
        </Content>

        <div className={setupModalStyles.section}>
          <button
            type="button"
            className={setupModalStyles.sectionHeader}
            onClick={() => setCredExpanded((v) => !v)}
          >
            <div className={setupModalStyles.sectionHeaderLeft}>
              <Icon>
                <InfoCircleIcon color="var(--pf-t--global--icon--color--status--info--default)" />
              </Icon>
              <div className={setupModalStyles.sectionTitle}>
                <strong>vCenter credentials</strong>
                <Content component="small">
                  Required to discover datastores and run the offload benchmark
                </Content>
              </div>
            </div>
            <div className={setupModalStyles.sectionHeaderRight}>
              {credentialsSubmitted ? (
                <span className={setupModalStyles.statusSuccess}>
                  <CheckCircleIcon /> Submitted
                </span>
              ) : (
                <span className={setupModalStyles.statusPending}>
                  Not submitted
                </span>
              )}
              <AngleRightIcon
                style={{
                  transition: "transform 0.2s",
                  transform: credExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
            </div>
          </button>
          {credExpanded && (
            <div className={setupModalStyles.sectionBody}>
              <CredentialsForm
                credentials={credentials}
                onChange={onCredentialsChange}
                error={credError}
                missingPrivileges={credMissingPrivileges}
                isLoading={credLoading}
                acknowledged={credAcknowledged}
                onAcknowledgedChange={onCredAcknowledgedChange}
              />
              {!credentialsSubmitted && (
                <Button
                  variant="secondary"
                  onClick={onSubmitCredentials}
                  isLoading={credLoading}
                  isDisabled={!canSubmitCredentials || credLoading}
                  style={{ marginTop: "8px" }}
                >
                  Submit credentials
                </Button>
              )}
            </div>
          )}
        </div>

        <div
          className={
            credentialsSubmitted
              ? setupModalStyles.section
              : setupModalStyles.sectionLocked
          }
        >
          <button
            type="button"
            className={setupModalStyles.sectionHeader}
            onClick={() => credentialsSubmitted && setPairsExpanded((v) => !v)}
            disabled={!credentialsSubmitted}
          >
            <div className={setupModalStyles.sectionHeaderLeft}>
              <Icon>
                <InfoCircleIcon color="var(--pf-t--global--icon--color--status--info--default)" />
              </Icon>
              <div className={setupModalStyles.sectionTitle}>
                <strong>Datastore pairs</strong>
                <Content component="small">
                  {credentialsSubmitted
                    ? "Select source and target datastores for each migration path"
                    : "Submit vCenter credentials above to unlock this step"}
                </Content>
              </div>
            </div>
            <div className={setupModalStyles.sectionHeaderRight}>
              {!credentialsSubmitted ? (
                <span className={setupModalStyles.statusPending}>Locked</span>
              ) : pairsReady ? (
                <span className={setupModalStyles.statusSuccess}>
                  <CheckCircleIcon /> Ready
                </span>
              ) : (
                <span className={setupModalStyles.statusPending}>
                  Not ready
                </span>
              )}
              <AngleRightIcon
                style={{
                  transition: "transform 0.2s",
                  transform: pairsExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
            </div>
          </button>
          {credentialsSubmitted && pairsExpanded && (
            <div className={setupModalStyles.sectionBody}>
              <SelectPairsForm
                datastores={datastores}
                groups={groups}
                pairs={draft.pairs}
                onPairsChange={(pairs) => onDraftChange({ ...draft, pairs })}
                isLoading={dsLoading}
                error={dsError}
                pairCapsMap={pairCapsMap}
                capsLoading={capsLoading}
                showVmWarning
                vmAcknowledged={draft.vmAcknowledged}
                onVmAcknowledgedChange={(vmAcknowledged) =>
                  onDraftChange({ ...draft, vmAcknowledged })
                }
              />
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onRun}
          isLoading={runLoading}
          isDisabled={!canRun || runLoading}
        >
          Run estimation
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RunEstimateModal.displayName = "RunEstimateModal";

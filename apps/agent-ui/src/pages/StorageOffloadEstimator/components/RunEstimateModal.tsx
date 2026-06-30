import {
  Alert,
  Button,
  Checkbox,
  Content,
  Flex,
  FlexItem,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import {
  AngleRightIcon,
  CheckCircleIcon,
  ExternalLinkAltIcon,
  InfoCircleIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import { TechnologyPreviewBadge } from "../../../common/components/TechnologyPreviewBadge";
import { setupModalStyles } from "../../Groups/components/modals/setupModalStyles";
import type {
  DatastoreGroup,
  ForecasterDatastore,
  SelectedPair,
} from "../utils/forecasterTypes";
import { SelectPairsForm } from "./SelectPairsForm";
import { isCompletePair } from "./storageOffloadUtils";

export type SetupDraft = { pairs: SelectedPair[]; vmAcknowledged: boolean };

export interface RunEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [pairsExpanded, setPairsExpanded] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setPairsExpanded(true);
    }
  }, [isOpen]);

  const pairsReady =
    draft.pairs.some(isCompletePair) && !hasNoCaps && draft.vmAcknowledged;

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
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              Choose datastore pairs, then run the estimate. Results appear on
              the main page when the benchmark starts.
            </Content>
          </StackItem>
          <StackItem>
            <Alert
              variant="warning"
              isInline
              title="The forecaster creates temporary virtual machines and virtual disks in your vCenter environment"
            >
              <Content component="p" style={{ marginBottom: "12px" }}>
                While all resources are cleaned up automatically after
                benchmarking, vCenter administrators should be aware of this
                activity.
              </Content>
              <Checkbox
                id="pairs-acknowledge-temp-resources"
                label={
                  <span>
                    I understand temporary resources will be created in my
                    vCenter environment.{" "}
                    <a
                      href="https://docs.redhat.com/en/documentation/migration_toolkit_for_virtualization/2.10/html-single/planning_your_migration_to_red_hat_openshift_virtualization/index#about-storage-copy-offload_vmware"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more <ExternalLinkAltIcon />
                    </a>
                  </span>
                }
                isChecked={draft.vmAcknowledged}
                onChange={(_e, checked) =>
                  onDraftChange({ ...draft, vmAcknowledged: checked })
                }
              />
            </Alert>
          </StackItem>
          <StackItem>
            <div className={setupModalStyles.section}>
              <button
                type="button"
                className={setupModalStyles.sectionHeader}
                onClick={() => setPairsExpanded((v) => !v)}
              >
                <div className={setupModalStyles.sectionHeaderLeft}>
                  <Icon>
                    <InfoCircleIcon color="var(--pf-t--global--icon--color--status--info--default)" />
                  </Icon>
                  <div className={setupModalStyles.sectionTitle}>
                    <strong>Datastore pairs</strong>
                    <Content component="small">
                      Select source and target datastores for each migration
                      path
                    </Content>
                  </div>
                </div>
                <div className={setupModalStyles.sectionHeaderRight}>
                  {pairsReady ? (
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
                      transform: pairsExpanded
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  />
                </div>
              </button>
              {pairsExpanded && (
                <div className={setupModalStyles.sectionBody}>
                  <SelectPairsForm
                    datastores={datastores}
                    groups={groups}
                    pairs={draft.pairs}
                    onPairsChange={(pairs) =>
                      onDraftChange({ ...draft, pairs })
                    }
                    isLoading={dsLoading}
                    error={dsError}
                    pairCapsMap={pairCapsMap}
                    capsLoading={capsLoading}
                  />
                </div>
              )}
            </div>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onRun}
          isLoading={runLoading}
          isDisabled={!canRun || runLoading}
        >
          Run estimation
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RunEstimateModal.displayName = "RunEstimateModal";

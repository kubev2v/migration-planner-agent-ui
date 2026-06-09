import { css } from "@emotion/css";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";
import {
  CheckIcon,
  PencilAltIcon,
  TimesIcon,
  TrashIcon,
} from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const VM_COLUMN_WIDTH = "3.5rem";
const ACTIONS_COLUMN_WIDTH = "4.5rem";

const styles = {
  labelList: css`
    width: 100%;
  `,
  labelHeader: css`
    display: grid;
    grid-template-columns: 1fr ${VM_COLUMN_WIDTH} ${ACTIONS_COLUMN_WIDTH};
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--pf-t--global--border--color--default);
    font-weight: 700;
    font-size: 13px;
    align-items: end;
  `,
  labelRow: css`
    display: grid;
    grid-template-columns: 1fr ${VM_COLUMN_WIDTH} ${ACTIONS_COLUMN_WIDTH};
    gap: 16px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--pf-t--global--border--color--default);
  `,
  labelRowEditing: css`
    display: grid;
    grid-template-columns: 1fr ${VM_COLUMN_WIDTH} ${ACTIONS_COLUMN_WIDTH};
    gap: 16px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--pf-t--global--border--color--default);
  `,
  vmColumn: css`
    text-align: left;
  `,
  actionsColumn: css`
    display: flex;
    justify-content: flex-end;
  `,
  editInputGroup: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  actionButtons: css`
    display: flex;
    gap: 4px;
  `,
};

interface LabelInfo {
  name: string;
  vmCount: number;
}

interface PendingRename {
  oldName: string;
  newName: string;
}

interface ManageLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLabelsChanged: () => void;
  agentApi: DefaultApiInterface;
}

export const ManageLabelsModal: React.FC<ManageLabelsModalProps> = ({
  isOpen,
  onClose,
  onLabelsChanged,
  agentApi,
}) => {
  const [labels, setLabels] = useState<LabelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingLabel, setDeletingLabel] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pendingDeletes = useRef<string[]>([]);
  const pendingRenames = useRef<PendingRename[]>([]);

  const fetchLabelsWithCounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentApi.getVMLabels();
      setLabels(
        (data.labels ?? []).map((name, i) => ({
          name,
          vmCount: data.counts?.[i] ?? 0,
        })),
      );
    } catch (err) {
      console.error("Error fetching labels:", err);
      setLabels([]);
    } finally {
      setLoading(false);
    }
  }, [agentApi]);

  useEffect(() => {
    if (isOpen) {
      fetchLabelsWithCounts();
      setEditingLabel(null);
      setEditValue("");
      setDeletingLabel(null);
      pendingDeletes.current = [];
      pendingRenames.current = [];
    }
  }, [isOpen, fetchLabelsWithCounts]);

  const handleDeleteLabel = (labelName: string) => {
    setLabels((prev) => prev.filter((l) => l.name !== labelName));
    setDeletingLabel(null);
    pendingDeletes.current.push(labelName);
    pendingRenames.current = pendingRenames.current.filter(
      (r) => r.oldName !== labelName && r.newName !== labelName,
    );
  };

  const handleRenameLabel = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingLabel(null);
      return;
    }

    if (labels.some((l) => l.name === trimmed && l.name !== oldName)) {
      setEditingLabel(null);
      return;
    }

    setLabels((prev) =>
      prev.map((l) => (l.name === oldName ? { ...l, name: trimmed } : l)),
    );
    setEditingLabel(null);

    const existingRename = pendingRenames.current.find(
      (r) => r.newName === oldName,
    );
    if (existingRename) {
      existingRename.newName = trimmed;
    } else {
      pendingRenames.current.push({ oldName, newName: trimmed });
    }
  };

  const startEditing = (labelName: string) => {
    setEditingLabel(labelName);
    setEditValue(labelName);
  };

  const cancelEditing = () => {
    setEditingLabel(null);
    setEditValue("");
  };

  const handleSave = async () => {
    if (editingLabel) {
      handleRenameLabel(editingLabel, editValue);
    }

    setIsSaving(true);
    try {
      for (const labelName of pendingDeletes.current) {
        await agentApi.deleteLabelGlobally({ label: labelName });
      }

      for (const { oldName, newName } of pendingRenames.current) {
        const vmIds: string[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const vmsData = await agentApi.getVMs({ page, pageSize: 1000 });
          for (const vm of vmsData.vms ?? []) {
            if (vm.labels?.includes(oldName)) {
              vmIds.push(vm.id);
            }
          }
          const total = vmsData.total ?? 0;
          hasMore = page * 1000 < total;
          page++;
        }

        if (vmIds.length > 0) {
          await agentApi.updateLabelVMs({
            label: newName,
            updateLabelVMsRequest: { add: vmIds },
          });
        }

        await agentApi.deleteLabelGlobally({ label: oldName });
      }

      pendingDeletes.current = [];
      pendingRenames.current = [];
      onLabelsChanged();
      onClose();
    } catch (err) {
      console.error("Error saving labels:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !deletingLabel}
        onClose={onClose}
        aria-labelledby="manage-labels-title"
        aria-describedby="manage-labels-body"
        variant="medium"
      >
        <ModalHeader title="Manage all labels" labelId="manage-labels-title" />
        <ModalBody id="manage-labels-body">
          <Content component="p" style={{ marginBottom: "16px" }}>
            View, rename, or delete labels. Renaming or deleting a label updates
            every virtual machine that uses it. To create a new label, use the
            &apos;Add Labels&apos; action on your virtual machines.
          </Content>

          {loading ? (
            <Content component="p">Loading labels...</Content>
          ) : labels.length === 0 ? (
            <Content component="p">No labels found.</Content>
          ) : (
            <div className={styles.labelList}>
              <div className={styles.labelHeader}>
                <span>Label</span>
                <span className={styles.vmColumn}>VMs</span>
                <span className={styles.actionsColumn} aria-hidden="true" />
              </div>
              {labels.map((label) => (
                <div
                  key={label.name}
                  className={
                    editingLabel === label.name
                      ? styles.labelRowEditing
                      : styles.labelRow
                  }
                >
                  {editingLabel === label.name ? (
                    <div className={styles.editInputGroup}>
                      <TextInput
                        type="text"
                        value={editValue}
                        onChange={(_e, value) => setEditValue(value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameLabel(label.name, editValue);
                          } else if (e.key === "Escape") {
                            cancelEditing();
                          }
                        }}
                        aria-label="Edit label name"
                        autoFocus
                      />
                      <Button
                        variant="plain"
                        aria-label="Confirm rename"
                        onClick={() => handleRenameLabel(label.name, editValue)}
                      >
                        <CheckIcon />
                      </Button>
                      <Button
                        variant="plain"
                        aria-label="Cancel rename"
                        onClick={cancelEditing}
                      >
                        <TimesIcon />
                      </Button>
                    </div>
                  ) : (
                    <span>{label.name}</span>
                  )}
                  <span className={styles.vmColumn}>{label.vmCount}</span>
                  {editingLabel !== label.name && (
                    <div
                      className={`${styles.actionsColumn} ${styles.actionButtons}`}
                    >
                      <Button
                        variant="plain"
                        aria-label={`Edit label ${label.name}`}
                        onClick={() => startEditing(label.name)}
                      >
                        <PencilAltIcon />
                      </Button>
                      <Button
                        variant="plain"
                        aria-label={`Delete label ${label.name}`}
                        onClick={() => setDeletingLabel(label.name)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            isDisabled={isSaving}
          >
            Save
          </Button>
          <Button variant="link" onClick={onClose} isDisabled={isSaving}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deletingLabel}
        onClose={() => setDeletingLabel(null)}
        aria-labelledby="delete-label-title"
        aria-describedby="delete-label-body"
        variant="small"
      >
        <ModalHeader title="Delete label?" labelId="delete-label-title" />
        <ModalBody id="delete-label-body">
          <Content component="p">
            Remove label <strong>{deletingLabel}</strong> from every virtual
            machine that uses it?
          </Content>
        </ModalBody>
        <ModalFooter>
          <Flex gap={{ default: "gapMd" }}>
            <FlexItem>
              <Button
                variant="danger"
                onClick={() =>
                  deletingLabel && handleDeleteLabel(deletingLabel)
                }
              >
                Delete
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="link" onClick={() => setDeletingLabel(null)}>
                Cancel
              </Button>
            </FlexItem>
          </Flex>
        </ModalFooter>
      </Modal>
    </>
  );
};

ManageLabelsModal.displayName = "ManageLabelsModal";

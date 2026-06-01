import type { Group } from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import { ExclamationTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useState } from "react";

interface DeleteGroupModalProps {
  isOpen: boolean;
  group: Group | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  group,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDeleteError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setDeleteError(null);
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onConfirm();
      handleClose();
    } catch (err) {
      console.error("Failed to delete group:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete group.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="small"
      aria-labelledby="delete-group-title"
    >
      <ModalHeader
        title={
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapSm" }}
          >
            <FlexItem>
              <ExclamationTriangleIcon
                style={{
                  color:
                    "var(--pf-t--global--icon--color--status--warning--default)",
                }}
              />
            </FlexItem>
            <FlexItem>Delete group?</FlexItem>
          </Flex>
        }
        labelId="delete-group-title"
      />
      <ModalBody>
        <Content component="p">
          Deleting group <strong>{group?.name}</strong> also deletes any
          assessments created for it. Your virtual machines will not be deleted
          and will remain in the virtual machines list.
        </Content>
        {deleteError && (
          <Content
            component="p"
            style={{
              color:
                "var(--pf-t--global--text--color--status--danger--default)",
              marginTop: "16px",
            }}
          >
            {deleteError}
          </Content>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={isDeleting}
          isDisabled={isDeleting}
        >
          Delete group
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

DeleteGroupModal.displayName = "DeleteGroupModal";

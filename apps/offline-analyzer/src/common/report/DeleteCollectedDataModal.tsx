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
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import type React from "react";

interface DeleteCollectedDataModalProps {
  isOpen: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteCollectedDataModal: React.FC<
  DeleteCollectedDataModalProps
> = ({ isOpen, isDeleting = false, onClose, onConfirm }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-labelledby="delete-collected-data-title"
    >
      <ModalHeader
        title={
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapSm" }}
          >
            <FlexItem>
              <ExclamationCircleIcon
                style={{
                  color:
                    "var(--pf-t--global--icon--color--status--danger--default)",
                }}
              />
            </FlexItem>
            <FlexItem>Delete collected data?</FlexItem>
          </Flex>
        }
        labelId="delete-collected-data-title"
      />
      <ModalBody>
        <Content component="p">
          This permanently removes the assessment report, virtual machine
          inventory, and any other collected data from this appliance. This
          cannot be undone.
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={onConfirm}
          isLoading={isDeleting}
          isDisabled={isDeleting}
        >
          Delete data
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

DeleteCollectedDataModal.displayName = "DeleteCollectedDataModal";

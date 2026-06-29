import {
  Alert,
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

interface RemoveVCenterConnectionModalProps {
  isOpen: boolean;
  isRemoving: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const RemoveVCenterConnectionModal: React.FC<
  RemoveVCenterConnectionModalProps
> = ({ isOpen, isRemoving, error, onClose, onConfirm }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-labelledby="remove-vcenter-connection-title"
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
            <FlexItem>Remove vCenter connection?</FlexItem>
          </Flex>
        }
        labelId="remove-vcenter-connection-title"
      />
      <ModalBody>
        <Content component="p">
          This will remove your vCenter credentials saved locally. You will need
          to reconnect to perform assessments, deep inspections, and storage
          offload estimations.
        </Content>
        <Content component="p">
          The assessment report already created will remain available and
          viewable.
        </Content>
        {error && (
          <Alert variant="danger" title={error} aria-live="polite" isInline />
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={onConfirm}
          isLoading={isRemoving}
          isDisabled={isRemoving}
        >
          Remove connection
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isRemoving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RemoveVCenterConnectionModal.displayName = "RemoveVCenterConnectionModal";

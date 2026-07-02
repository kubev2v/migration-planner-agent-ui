import {
  Alert,
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import type React from "react";

export interface StartOverConfirmModalProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  isConfirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StartOverConfirmModal: React.FC<StartOverConfirmModalProps> = ({
  isOpen,
  isLoading,
  error,
  isConfirmDisabled = false,
  onClose,
  onConfirm,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    aria-labelledby="start-over-title"
    aria-describedby="start-over-body"
    variant="small"
  >
    <ModalHeader
      title="Start over"
      titleIconVariant="warning"
      labelId="start-over-title"
    />
    <ModalBody id="start-over-body">
      {error && (
        <Alert variant="danger" title="Unable to start over" isInline>
          {error}
        </Alert>
      )}
      <Content component="p">
        Starting over deletes all estimation and forecast runs stored on the
        backend, not only the results shown here. This cannot be undone.
      </Content>
    </ModalBody>
    <ModalFooter>
      <Button
        variant="danger"
        isLoading={isLoading}
        isDisabled={isLoading || isConfirmDisabled}
        onClick={onConfirm}
      >
        Start over
      </Button>
      <Button
        variant="link"
        isDisabled={isLoading || isConfirmDisabled}
        onClick={onClose}
      >
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

StartOverConfirmModal.displayName = "StartOverConfirmModal";

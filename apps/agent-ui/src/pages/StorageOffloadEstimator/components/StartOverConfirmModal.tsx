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
  onClose: () => void;
  onConfirm: () => void;
}

export const StartOverConfirmModal: React.FC<StartOverConfirmModalProps> = ({
  isOpen,
  isLoading,
  error,
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
        All estimations you currently see will be completely removed.
      </Content>
    </ModalBody>
    <ModalFooter>
      <Button
        variant="danger"
        isLoading={isLoading}
        isDisabled={isLoading}
        onClick={onConfirm}
      >
        Start over
      </Button>
      <Button variant="link" isDisabled={isLoading} onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

StartOverConfirmModal.displayName = "StartOverConfirmModal";

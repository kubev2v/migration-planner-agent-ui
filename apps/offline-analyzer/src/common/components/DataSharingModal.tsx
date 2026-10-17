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

interface DataSharingModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const DataSharingModal: React.FC<DataSharingModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  error = null,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      aria-labelledby="data-sharing-modal-title"
      aria-describedby="data-sharing-modal-body"
      variant="small"
    >
      <ModalHeader title="Share data" labelId="data-sharing-modal-title" />
      <ModalBody id="data-sharing-modal-body">
        {error && (
          <Alert
            variant="danger"
            title="Error"
            isInline
            style={{ marginBottom: "1rem" }}
          >
            {error}
          </Alert>
        )}
        <Content component="p">
          By sharing data with Red Hat, you gain access to exclusive cloud
          capabilities and enhanced insights.
        </Content>
        <Content component="p">
          <strong>Important:</strong> This operation is permanent and cannot be
          undone.
        </Content>
        <Content component="p">Do you want to enable data sharing?</Content>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onConfirm}
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          {error ? "Retry" : "Share"}
        </Button>
        <Button variant="link" onClick={onCancel} isDisabled={isLoading}>
          {error ? "Close" : "Cancel"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

DataSharingModal.displayName = "DataSharingModal";

import type {
  CredentialStatus,
  VcenterCredentials,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Content,
  ContentVariants,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import type React from "react";
import { VCenterCredentialsForm } from "./VCenterCredentialsForm";

interface VCenterCredentialsModalProps {
  isOpen: boolean;
  credentialStatus: CredentialStatus | null;
  isUpdating: boolean;
  error?: string;
  onClose: () => void;
  onUpdate: (credentials: VcenterCredentials) => void;
}

export const VCenterCredentialsModal: React.FC<
  VCenterCredentialsModalProps
> = ({ isOpen, credentialStatus, isUpdating, error, onClose, onUpdate }) => {
  const isCreating = credentialStatus === null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-labelledby="edit-vcenter-credentials-title"
    >
      <ModalHeader
        title={isCreating ? "Connect to vCenter" : "Edit vCenter credential"}
        labelId="edit-vcenter-credentials-title"
      />
      <ModalBody>
        <Content component={ContentVariants.p}>
          {isCreating
            ? "Provide credentials for the vCenter connection. This is used for the assessment report, deep inspection and storage offload estimation."
            : "Update credentials for the vCenter connection. This is used for the assessment report, deep inspection and storage offload estimation."}
        </Content>
        <VCenterCredentialsForm
          isEditing={!isCreating}
          onSubmit={onUpdate}
          error={error}
          initialCredentials={credentialStatus}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="vcenter-credentials-form"
          isLoading={isUpdating}
        >
          {isCreating ? "Connect" : "Update credentials"}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isUpdating}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

VCenterCredentialsModal.displayName = "VCenterCredentialsModal";

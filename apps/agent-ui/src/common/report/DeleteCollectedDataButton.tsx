import { Button, Tooltip } from "@patternfly/react-core";
import { TrashIcon } from "@patternfly/react-icons";
import type React from "react";
import { useState } from "react";
import { useGetCredentialsQuery } from "../../store/api/credentialsEndpoints";
import { useDeleteCollectedDataMutation } from "../../store/api/lifecycleEndpoints";
import { DeleteCollectedDataModal } from "./DeleteCollectedDataModal";

export const DeleteCollectedDataButton: React.FC = () => {
  const { data: credentialStatus = null } = useGetCredentialsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteCollectedData, { isLoading: isDeleting }] =
    useDeleteCollectedDataMutation();

  const shouldBeVisible = credentialStatus === null;
  if (!shouldBeVisible) return null;

  const handleConfirm = async () => {
    try {
      await deleteCollectedData().unwrap();
      setIsModalOpen(false);
    } catch {
      // Keep the modal open so the user can retry.
    }
  };

  return (
    <>
      <Tooltip content="Delete collected data" position="left">
        <Button
          variant="link"
          onClick={() => setIsModalOpen(true)}
          icon={<TrashIcon />}
        />
      </Tooltip>
      <DeleteCollectedDataModal
        isOpen={isModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
};

DeleteCollectedDataButton.displayName = "DeleteCollectedDataButton";

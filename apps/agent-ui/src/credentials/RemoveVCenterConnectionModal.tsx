import {
  Alert,
  Button,
  Checkbox,
  Content,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { ExclamationTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useState } from "react";

interface RemoveVCenterConnectionModalProps {
  isOpen: boolean;
  isRemoving: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (deleteCollectedData: boolean) => void;
}

export const RemoveVCenterConnectionModal: React.FC<
  RemoveVCenterConnectionModalProps
> = ({ isOpen, isRemoving, error, onClose, onConfirm }) => {
  const [deleteCollectedData, setDeleteCollectedData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeleteCollectedData(false);
    }
  }, [isOpen]);

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
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              This will remove your vCenter credentials saved locally. You will
              need to reconnect to perform assessments, deep inspections, and
              storage offload estimations.
              <br />
              Collected data on this appliance stays available after disconnect.
              To remove it later, use the delete button next to Export.
            </Content>
            <Checkbox
              id="remove-vcenter-delete-collected-data"
              label="Also delete all collected data"
              description="Permanently removes the assessment report, virtual machine inventory, and any other collected data from this appliance. This cannot be undone."
              isChecked={deleteCollectedData}
              onChange={(_event, checked) => setDeleteCollectedData(checked)}
              isDisabled={isRemoving}
            />
          </StackItem>
          {error && (
            <StackItem>
              <Alert
                variant="danger"
                title={error}
                aria-live="polite"
                isInline
              />
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={() => onConfirm(deleteCollectedData)}
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

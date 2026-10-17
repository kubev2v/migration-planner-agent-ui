import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AddLabelsForm } from "./AddLabelsForm";

interface AddLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (labelsToAdd: string[], labelsToRemove: string[]) => Promise<void>;
  selectedVMCount: number;
  existingLabels: string[];
  currentVMLabels?: string[];
  selectedVMName?: string;
  mode?: "add" | "edit";
}

export const AddLabelsModal: React.FC<AddLabelsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedVMCount,
  existingLabels,
  currentVMLabels = [],
  selectedVMName,
  mode = "add",
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSelected(mode === "edit" ? [...currentVMLabels] : []);
      setIsSubmitting(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentVMLabels, mode]);

  const labelsToAdd =
    mode === "add"
      ? selected
      : selected.filter((l) => !currentVMLabels.includes(l));
  const labelsToRemove =
    mode === "add" ? [] : currentVMLabels.filter((l) => !selected.includes(l));
  const hasChanges =
    mode === "add"
      ? selected.length > 0
      : labelsToAdd.length > 0 || labelsToRemove.length > 0;

  const handleSubmit = async () => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    try {
      await onSubmit(labelsToAdd, labelsToRemove);
      onClose();
    } catch (err) {
      console.error("Error updating labels:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="add-labels-title"
      aria-describedby="add-labels-body"
      variant="medium"
    >
      <ModalHeader
        title={mode === "edit" ? "Edit labels" : "Add labels"}
        labelId="add-labels-title"
      />
      <ModalBody id="add-labels-body">
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              {mode === "edit" ? (
                selectedVMName ? (
                  <>
                    Add or remove labels for <strong>{selectedVMName}</strong>.
                  </>
                ) : (
                  "Add or remove labels for this virtual machine."
                )
              ) : (
                `Applies to the ${selectedVMCount} selected VM${selectedVMCount !== 1 ? "s" : ""}. Add one or more labels. Existing labels on those VMs are not shown and will not be changed.`
              )}
            </Content>
          </StackItem>
          <StackItem>
            <AddLabelsForm
              existingLabels={existingLabels}
              selected={selected}
              onSelectedChange={setSelected}
              mode={mode}
            />
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!hasChanges || isSubmitting}
          isLoading={isSubmitting}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AddLabelsModal.displayName = "AddLabelsModal";

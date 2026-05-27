import {
  Button,
  Content,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useState } from "react";

interface LabelItem {
  name: string;
  id: number;
  props: {
    isEditable: boolean;
    editableProps: { "aria-label": string };
  };
}

interface AddLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (labels: string[]) => Promise<void>;
  selectedVMCount: number;
  existingLabels: string[];
}

export const AddLabelsModal: React.FC<AddLabelsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedVMCount,
  existingLabels: _existingLabels,
}) => {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [idIndex, setIdIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLabels([]);
      setIdIndex(0);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const onAdd = () => {
    setLabels([
      {
        name: "New label",
        id: idIndex,
        props: {
          isEditable: true,
          editableProps: {
            "aria-label": "Editable label with text New label",
          },
        },
      },
      ...labels,
    ]);
    setIdIndex(idIndex + 1);
  };

  const onLabelClose = (labelId: number) => {
    setLabels(labels.filter((l) => l.id !== labelId));
  };

  const onEdit = (nextText: string, index: number) => {
    const copy = [...labels];
    copy[index] = {
      ...labels[index],
      name: nextText,
      props: {
        ...labels[index].props,
        editableProps: {
          "aria-label": `Editable label with text ${nextText}`,
        },
      },
    };
    setLabels(copy);
  };

  const handleSubmit = async () => {
    const labelNames = labels
      .map((l) => l.name.trim())
      .filter((name) => name.length > 0);
    if (labelNames.length === 0) return;

    const uniqueNames = [...new Set(labelNames)];
    setIsSubmitting(true);
    try {
      await onSubmit(uniqueNames);
      onClose();
    } catch (err) {
      console.error("Error adding labels:", err);
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
      <ModalHeader title="Add labels" labelId="add-labels-title" />
      <ModalBody id="add-labels-body" style={{ minHeight: "180px" }}>
        <Content component="p" style={{ marginBottom: "16px" }}>
          Applies to the {selectedVMCount} selected VM
          {selectedVMCount !== 1 ? "s" : ""}. You can add a custom label, or
          select an existing label.
        </Content>

        <div style={{ marginBottom: "8px" }}>
          <strong>Labels</strong>
        </div>

        <LabelGroup
          aria-label="Labels to add"
          numLabels={20}
          addLabelControl={
            <Label variant="add" onClick={onAdd}>
              Add label
            </Label>
          }
        >
          {labels.map((label, index) => (
            <Label
              key={label.id}
              onClose={() => onLabelClose(label.id)}
              onEditCancel={(_event, prevText) => onEdit(prevText, index)}
              onEditComplete={(_event, newText) => onEdit(newText, index)}
              {...label.props}
            >
              {label.name}
            </Label>
          ))}
        </LabelGroup>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={labels.length === 0 || isSubmitting}
          isLoading={isSubmitting}
        >
          Add labels
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AddLabelsModal.displayName = "AddLabelsModal";

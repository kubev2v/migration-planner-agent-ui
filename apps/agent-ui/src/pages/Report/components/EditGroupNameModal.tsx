import type { Group } from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useState } from "react";
import { parseApiError } from "../../../common/parseApiError";

interface EditGroupNameModalProps {
  isOpen: boolean;
  group: Group | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export const EditGroupNameModal: React.FC<EditGroupNameModalProps> = ({
  isOpen,
  group,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setError(null);
    }
  }, [isOpen, group]);

  const handleSave = async () => {
    if (!group) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Group name is required.");
      return;
    }
    if (trimmed === group.name) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(await parseApiError(err, "Failed to update group."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-labelledby="edit-group-name-title"
    >
      <ModalHeader title="Edit group name" labelId="edit-group-name-title" />
      <ModalBody>
        <Form
          id="edit-group-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <FormGroup label="Group name" isRequired fieldId="edit-group-name">
            <TextInput
              id="edit-group-name"
              value={name}
              onChange={(_event, value) => setName(value)}
              validated={error ? "error" : "default"}
              aria-describedby={error ? "edit-group-name-error" : undefined}
            />
            {error && (
              <div
                id="edit-group-name-error"
                style={{
                  color:
                    "var(--pf-t--global--text--color--status--danger--default)",
                  marginTop: "4px",
                }}
              >
                {error}
              </div>
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="edit-group-form"
          isLoading={isSaving}
          isDisabled={isSaving || !group || !name.trim()}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSaving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

EditGroupNameModal.displayName = "EditGroupNameModal";

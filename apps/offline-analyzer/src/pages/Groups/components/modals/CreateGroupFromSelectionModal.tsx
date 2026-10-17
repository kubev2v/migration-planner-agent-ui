import {
  Button,
  Content,
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
import { parseApiError } from "../../../../common/parseApiError";
import { useCreateGroupMutation } from "../../../../store/api/groupsEndpoints";
import { vmIdsToFilterExpression } from "../../utils/groupFilters";

interface CreateGroupFromSelectionModalProps {
  isOpen: boolean;
  vmIds: string[];
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateGroupFromSelectionModal: React.FC<
  CreateGroupFromSelectionModalProps
> = ({ isOpen, vmIds, onClose, onCreated }) => {
  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Group name is required.");
      return;
    }
    if (vmIds.length === 0) {
      setError("Select at least one virtual machine.");
      return;
    }

    setError(null);
    try {
      await createGroup({
        createGroupRequest: {
          name: trimmed,
          filter: vmIdsToFilterExpression(vmIds),
        },
      }).unwrap();
      onCreated?.();
      onClose();
    } catch (err) {
      setError(await parseApiError(err, "Failed to create group."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-labelledby="create-group-selection-title"
    >
      <ModalHeader
        title="Create group"
        labelId="create-group-selection-title"
      />
      <ModalBody>
        <Content component="p" style={{ marginBottom: "16px" }}>
          Create a group with the {vmIds.length} selected virtual machine
          {vmIds.length === 1 ? "" : "s"}.
        </Content>
        <Content component="p" style={{ marginTop: "16px" }}>
          A targeted assessment report will be generated for the group of
          virtual machines created.
        </Content>
        <Form
          id="create-group-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <FormGroup
            label="Group name"
            isRequired
            fieldId="create-group-selection-name"
          >
            <TextInput
              id="create-group-selection-name"
              value={name}
              onChange={(_event, value) => setName(value)}
              validated={error && !name.trim() ? "error" : "default"}
            />
          </FormGroup>
        </Form>
        {error && (
          <Content
            component="p"
            style={{
              color:
                "var(--pf-t--global--text--color--status--danger--default)",
              marginTop: "8px",
            }}
          >
            {error}
          </Content>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="create-group-form"
          isLoading={isCreating}
          isDisabled={isCreating || !name.trim()}
        >
          Create
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isCreating}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

CreateGroupFromSelectionModal.displayName = "CreateGroupFromSelectionModal";

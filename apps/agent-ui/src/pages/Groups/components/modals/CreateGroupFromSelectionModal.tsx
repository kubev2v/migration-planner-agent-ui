import { useInjection } from "@migration-planner-ui/ioc";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CancellableRequest,
  isAbortError,
  newCancellableRequest,
} from "../../../../common/AbortSignal";
import { parseApiError } from "../../../../common/parseApiError";
import { Symbols } from "../../../../main/Symbols";
import { vmIdsToFilterExpression } from "../../utils/groupFilters";
import { invalidateAllGroupsCache } from "../../utils/groupList";

interface CreateGroupFromSelectionModalProps {
  isOpen: boolean;
  vmIds: string[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateGroupFromSelectionModal: React.FC<
  CreateGroupFromSelectionModalProps
> = ({ isOpen, vmIds, onClose, onCreated }) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createRequestRef = useRef<CancellableRequest | null>(null);

  const cancelCreateRequest = useCallback(() => {
    createRequestRef.current?.cancel();
    createRequestRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cancelCreateRequest();
      setIsCreating(false);
      return;
    }

    setName("");
    setError(null);
    setIsCreating(false);
  }, [isOpen, cancelCreateRequest]);

  useEffect(() => () => cancelCreateRequest(), [cancelCreateRequest]);

  const handleClose = () => {
    cancelCreateRequest();
    setIsCreating(false);
    onClose();
  };

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

    setIsCreating(true);
    setError(null);

    const request = newCancellableRequest(
      "Creating the group timed out. The server may be busy running deep inspection. Try again in a moment.",
    );
    createRequestRef.current = request;

    try {
      await agentApi.createGroup(
        {
          createGroupRequest: {
            name: trimmed,
            filter: vmIdsToFilterExpression(vmIds),
          },
        },
        { signal: request.signal },
      );
      request.cleanup();
      createRequestRef.current = null;
      invalidateAllGroupsCache(agentApi);
      onCreated();
      handleClose();
    } catch (err) {
      request.cleanup();
      createRequestRef.current = null;
      if (request.wasCanceledByUser()) {
        return;
      }
      if (isAbortError(err)) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Creating the group timed out. Try again in a moment.",
        );
        return;
      }
      setError(await parseApiError(err, "Failed to create group."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

CreateGroupFromSelectionModal.displayName = "CreateGroupFromSelectionModal";

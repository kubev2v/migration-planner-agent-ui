import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  Group,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Content,
  Form,
  FormGroup,
  MenuToggle,
  type MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
  Spinner,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Symbols } from "../../../main/Symbols";
import { addVmsToGroupFilter } from "./groupFilters";
import { fetchAllGroups, invalidateAllGroupsCache } from "./groupList";

interface AddToGroupModalProps {
  isOpen: boolean;
  vmIds: string[];
  onClose: () => void;
  onUpdated: () => void;
}

export const AddToGroupModal: React.FC<AddToGroupModalProps> = ({
  isOpen,
  vmIds,
  onClose,
  onUpdated,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const vmCountLabel =
    vmIds.length === 1
      ? "1 selected virtual machine"
      : `${vmIds.length} selected virtual machines`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedGroupId("");
    setIsGroupSelectOpen(false);
    setError(null);

    const fetchGroups = async () => {
      setLoading(true);
      try {
        const loadedGroups = await fetchAllGroups(agentApi);
        setGroups(loadedGroups);
        if (loadedGroups.length === 1) {
          setSelectedGroupId(loadedGroups[0].id);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
        setGroups([]);
        setError("Failed to load groups.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [isOpen, agentApi]);

  const handleGroupSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === "string") {
      setSelectedGroupId(value);
    }
    setIsGroupSelectOpen(false);
  };

  const handleAdd = async () => {
    if (!selectedGroup) {
      setError("Select a group.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await agentApi.updateGroup({
        id: selectedGroup.id,
        updateGroupRequest: {
          filter: addVmsToGroupFilter(selectedGroup.filter, vmIds),
        },
      });
      invalidateAllGroupsCache(agentApi);
      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add VMs to group.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="small"
      aria-labelledby="add-to-group-title"
    >
      <ModalHeader title="Add to group" labelId="add-to-group-title" />
      <ModalBody>
        <Content component="p" style={{ marginBottom: "24px" }}>
          Select a group for the {vmCountLabel}. It will automatically be
          included in that group&apos;s assessment report.
        </Content>

        {loading ? (
          <Spinner size="lg" />
        ) : groups.length === 0 ? (
          <Content component="p">
            No groups available. Create a group first.
          </Content>
        ) : (
          <Form>
            <FormGroup label="Group" isRequired fieldId="add-to-group-select">
              <Select
                id="add-to-group-select"
                isOpen={isGroupSelectOpen}
                selected={selectedGroupId}
                onSelect={handleGroupSelect}
                onOpenChange={setIsGroupSelectOpen}
                isScrollable
                maxMenuHeight="280px"
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsGroupSelectOpen((open) => !open)}
                    isExpanded={isGroupSelectOpen}
                    style={{ width: "100%" }}
                  >
                    {selectedGroup?.name ?? "Select a group"}
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <SelectList>
                  {groups.map((group) => (
                    <SelectOption key={group.id} value={group.id}>
                      {group.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>
          </Form>
        )}

        {error && (
          <Content
            component="p"
            style={{
              color:
                "var(--pf-t--global--text--color--status--danger--default)",
              marginTop: "16px",
            }}
          >
            {error}
          </Content>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleAdd}
          isLoading={isSaving}
          isDisabled={
            isSaving || loading || groups.length === 0 || !selectedGroupId
          }
        >
          Add
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSaving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AddToGroupModal.displayName = "AddToGroupModal";

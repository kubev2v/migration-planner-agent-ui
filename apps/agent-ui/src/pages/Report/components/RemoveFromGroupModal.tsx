import { useInjection } from "@migration-planner-ui/ioc";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Symbols } from "../../../main/Symbols";
import { buildGroupFilterAfterRemovingMembers } from "./groupFilters";
import { fetchAllGroups, invalidateAllGroupsCache } from "./groupList";

interface GroupOption {
  id: string;
  name: string;
}

interface RemoveFromGroupModalProps {
  isOpen: boolean;
  vmIds: string[];
  vmNames: string[];
  /** When set (group detail page), skip group picker and target this group */
  fixedGroupId?: string;
  fixedGroupName?: string;
  /** Group names the selected VMs belong to (VM overview) */
  groupNames?: string[];
  onClose: () => void;
  onUpdated: () => void;
}

const GROUP_PAGE_SIZE = 100;

async function fetchAllGroupMemberIds(
  agentApi: DefaultApiInterface,
  groupId: string,
): Promise<string[]> {
  const firstPage = await agentApi.getGroup({
    id: groupId,
    page: 1,
    pageSize: GROUP_PAGE_SIZE,
  });

  const memberIds = firstPage.vms.map((vm) => vm.id);
  const pageCount = firstPage.pageCount ?? 1;

  for (let page = 2; page <= pageCount; page++) {
    const response = await agentApi.getGroup({
      id: groupId,
      page,
      pageSize: GROUP_PAGE_SIZE,
    });
    memberIds.push(...response.vms.map((vm) => vm.id));
  }

  return memberIds;
}

function buildRemovalDescription(vmCount: number): string {
  if (vmCount === 1) {
    return "Removing 1 selected virtual machine from the selected group will remove it from the group's assessment report.";
  }
  return `Removing ${vmCount} selected virtual machines from the selected group will remove them from the group's assessment report.`;
}

export const RemoveFromGroupModal: React.FC<RemoveFromGroupModalProps> = ({
  isOpen,
  vmIds,
  vmNames: _vmNames,
  fixedGroupId,
  fixedGroupName,
  groupNames = [],
  onClose,
  onUpdated,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedGroupId = fixedGroupId || selectedGroupId;
  const selectedGroup = useMemo(
    () => groupOptions.find((group) => group.id === resolvedGroupId),
    [groupOptions, resolvedGroupId],
  );
  const needsGroupPicker = !fixedGroupId && groupOptions.length > 1;

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (fixedGroupId) {
        setGroupOptions([
          { id: fixedGroupId, name: fixedGroupName ?? fixedGroupId },
        ]);
        setSelectedGroupId(fixedGroupId);
        return;
      }

      const allGroups = await fetchAllGroups(agentApi);
      const nameSet = new Set(groupNames);
      const matching = allGroups
        .filter((group) => nameSet.has(group.name))
        .map((group) => ({ id: group.id, name: group.name }));

      setGroupOptions(matching);
      if (matching.length === 1) {
        setSelectedGroupId(matching[0].id);
      } else {
        setSelectedGroupId("");
      }
    } catch (err) {
      console.error("Error loading groups:", err);
      setGroupOptions([]);
      setError("Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [agentApi, fixedGroupId, fixedGroupName, groupNames]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsGroupSelectOpen(false);
    setError(null);
    void loadGroups();
  }, [isOpen, loadGroups]);

  const handleGroupSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === "string") {
      setSelectedGroupId(value);
    }
    setIsGroupSelectOpen(false);
  };

  const handleRemove = async () => {
    if (!resolvedGroupId) {
      setError("Select a group.");
      return;
    }
    if (vmIds.length === 0) {
      setError("No virtual machines selected.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const currentMemberIds = await fetchAllGroupMemberIds(
        agentApi,
        resolvedGroupId,
      );
      const removeSet = new Set(vmIds);
      const matchedRemovals = currentMemberIds.filter((id) =>
        removeSet.has(id),
      );
      if (matchedRemovals.length === 0) {
        setError(
          "The selected virtual machines are not members of this group.",
        );
        return;
      }

      const updatedFilter = buildGroupFilterAfterRemovingMembers(
        currentMemberIds,
        vmIds,
      );

      await agentApi.updateGroup({
        id: resolvedGroupId,
        updateGroupRequest: {
          filter: updatedFilter,
        },
      });

      invalidateAllGroupsCache(agentApi);
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to remove VMs from group:", err);
      setError(
        err instanceof Error ? err.message : "Failed to remove VMs from group.",
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
      aria-labelledby="remove-from-group-title"
    >
      <ModalHeader
        title="Remove from group"
        labelId="remove-from-group-title"
      />
      <ModalBody>
        <Content component="p" style={{ marginBottom: "24px" }}>
          {buildRemovalDescription(vmIds.length)}
        </Content>
        {loading ? (
          <Spinner size="lg" />
        ) : groupOptions.length === 0 ? (
          <Content component="p">
            The selected virtual machines are not in any group.
          </Content>
        ) : (
          needsGroupPicker && (
            <Form>
              <FormGroup
                label="Group"
                isRequired
                fieldId="remove-from-group-select"
              >
                <Select
                  id="remove-from-group-select"
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
                    {groupOptions.map((group) => (
                      <SelectOption key={group.id} value={group.id}>
                        {group.name}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </FormGroup>
            </Form>
          )
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
          variant="danger"
          onClick={handleRemove}
          isLoading={isSaving}
          isDisabled={
            isSaving ||
            loading ||
            groupOptions.length === 0 ||
            !resolvedGroupId ||
            vmIds.length === 0
          }
        >
          Remove
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSaving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RemoveFromGroupModal.displayName = "RemoveFromGroupModal";

import {
  Button,
  Content,
  EmptyStateVariant,
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
import { DesktopIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { getAgentApiClient } from "../../../../api/agentApiClient";
import { AppEmptyState } from "../../../../common/components";
import {
  useChangeGroupMembershipMutation,
  useGetAllGroupsQuery,
} from "../../../../store/api/groupsEndpoints";
import { getSdkErrorMessage } from "../../../../store/baseQuery";
import { buildGroupFilterAfterRemovingMembers } from "../../utils/groupFilters";

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
  const firstPage = await agentApi.getLatestGroup({
    groupId,
    page: 1,
    pageSize: GROUP_PAGE_SIZE,
  });

  const memberIds = firstPage.vms.map((vm) => vm.id);
  const pageCount = firstPage.pageCount ?? 1;

  for (let page = 2; page <= pageCount; page++) {
    const response = await agentApi.getLatestGroup({
      groupId,
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
  const agentApi = getAgentApiClient();
  const [changeGroupMembership, { isLoading: isSaving }] =
    useChangeGroupMembershipMutation();
  const {
    data: allGroups = [],
    isFetching: loadingGroups,
    isError: loadFailed,
  } = useGetAllGroupsQuery(undefined, {
    skip: !isOpen || !!fixedGroupId,
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fixed group (from the group detail page) skips the picker; otherwise the
  // options are the caller's group names matched against the full group list.
  const groupOptions = useMemo<GroupOption[]>(() => {
    if (fixedGroupId) {
      return [{ id: fixedGroupId, name: fixedGroupName ?? fixedGroupId }];
    }
    const nameSet = new Set(groupNames);
    return allGroups
      .filter((group) => nameSet.has(group.name))
      .map((group) => ({ id: group.id, name: group.name }));
  }, [fixedGroupId, fixedGroupName, groupNames, allGroups]);

  const loading = !fixedGroupId && loadingGroups;
  const displayError =
    error ?? (loadFailed && !fixedGroupId ? "Failed to load groups." : null);

  const resolvedGroupId = fixedGroupId || selectedGroupId;
  const selectedGroup = useMemo(
    () => groupOptions.find((group) => group.id === resolvedGroupId),
    [groupOptions, resolvedGroupId],
  );
  const needsGroupPicker = !fixedGroupId && groupOptions.length > 1;

  // Reset the picker and auto-select when the modal opens or the options change.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setIsGroupSelectOpen(false);
    setError(null);
    if (fixedGroupId) {
      setSelectedGroupId(fixedGroupId);
    } else if (groupOptions.length === 1) {
      setSelectedGroupId(groupOptions[0].id);
    } else {
      setSelectedGroupId("");
    }
  }, [isOpen, fixedGroupId, groupOptions]);

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

      await changeGroupMembership({
        groupId: resolvedGroupId,
        filter: updatedFilter,
      }).unwrap();

      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to remove VMs from group:", err);
      setError(getSdkErrorMessage(err, "Failed to remove VMs from group."));
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
          <AppEmptyState
            titleText="The selected virtual machines are not in any group"
            icon={DesktopIcon}
            variant={EmptyStateVariant.xs}
            wrapInBullseye={false}
          />
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
        {displayError && (
          <Content
            component="p"
            style={{
              color:
                "var(--pf-t--global--text--color--status--danger--default)",
              marginTop: "16px",
            }}
          >
            {displayError}
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

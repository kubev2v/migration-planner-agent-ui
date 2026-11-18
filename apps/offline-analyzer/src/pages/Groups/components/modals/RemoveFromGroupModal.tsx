import type { Group } from "@openshift-migration-advisor/agent-sdk";
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
import {
  buildGroupFilterAfterRemovingMembers,
  parseIdsFromFilter,
  removeVmsFromGroupFilter,
} from "../../utils/groupFilters";

interface GroupOption {
  id: string;
  name: string;
}

const EMPTY_GROUPS: Group[] = [];
const EMPTY_GROUP_IDS: string[] = [];

interface RemoveFromGroupModalProps {
  isOpen: boolean;
  vmIds: string[];
  /** Set on the group detail page, where the target group is already known. */
  fixedGroupId?: string;
  fixedGroupName?: string;
  /** Groups that at least one selected VM belongs to in the overview. */
  groupIds?: string[];
  onClose: () => void;
  onUpdated: () => void;
}

const GROUP_PAGE_SIZE = 100;

async function fetchAllGroupMembers(
  agentApi: DefaultApiInterface,
  groupId: string,
): Promise<{ memberIds: string[]; filter: string }> {
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

  return { memberIds, filter: firstPage.group.filter };
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
  fixedGroupId,
  fixedGroupName,
  groupIds = EMPTY_GROUP_IDS,
  onClose,
  onUpdated,
}) => {
  const agentApi = getAgentApiClient();
  const [changeGroupMembership, { isLoading: isSaving }] =
    useChangeGroupMembershipMutation();
  const {
    data: allGroups = EMPTY_GROUPS,
    isFetching: loadingGroups,
    isError: loadFailed,
  } = useGetAllGroupsQuery(undefined, {
    skip: !isOpen || !!fixedGroupId,
  });
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const groupOptions = useMemo<GroupOption[]>(() => {
    if (fixedGroupId) {
      return [{ id: fixedGroupId, name: fixedGroupName ?? fixedGroupId }];
    }
    const groupIdSet = new Set(groupIds);
    return allGroups
      .filter((group) => groupIdSet.has(group.id))
      .map((group) => ({ id: group.id, name: group.name }));
  }, [fixedGroupId, fixedGroupName, groupIds, allGroups]);

  const loading = !fixedGroupId && loadingGroups;
  const displayError =
    error ?? (loadFailed && !fixedGroupId ? "Failed to load groups." : null);
  const resolvedGroupId = fixedGroupId || selectedGroupId;
  const selectedGroup = useMemo(
    () => groupOptions.find((group) => group.id === resolvedGroupId),
    [groupOptions, resolvedGroupId],
  );
  const needsGroupPicker = !fixedGroupId && groupOptions.length > 1;

  useEffect(() => {
    if (!isOpen) return;

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
    setIsRemoving(true);
    try {
      const { memberIds: currentMemberIds, filter: currentFilter } =
        await fetchAllGroupMembers(agentApi, resolvedGroupId);
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

      await changeGroupMembership({
        groupId: resolvedGroupId,
        filter:
          parseIdsFromFilter(currentFilter) !== null
            ? buildGroupFilterAfterRemovingMembers(
                currentMemberIds,
                matchedRemovals,
              )
            : removeVmsFromGroupFilter(currentFilter, matchedRemovals),
      }).unwrap();

      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to remove VMs from group:", err);
      setError(getSdkErrorMessage(err, "Failed to remove VMs from group."));
    } finally {
      setIsRemoving(false);
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
        ) : needsGroupPicker ? (
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
        ) : (
          <Form>
            <FormGroup label="Group" fieldId="remove-from-group-select">
              {selectedGroup?.name}
            </FormGroup>
          </Form>
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
          isLoading={isSaving || isRemoving}
          isDisabled={
            isSaving ||
            isRemoving ||
            loading ||
            groupOptions.length === 0 ||
            !resolvedGroupId ||
            vmIds.length === 0
          }
        >
          Remove
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isSaving || isRemoving}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RemoveFromGroupModal.displayName = "RemoveFromGroupModal";

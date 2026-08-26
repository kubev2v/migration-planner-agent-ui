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
import { AppEmptyState } from "../../../../common/components";
import {
  useChangeGroupMembershipMutation,
  useGetAllGroupsQuery,
} from "../../../../store/api/groupsEndpoints";
import { getSdkErrorMessage } from "../../../../store/baseQuery";
import { addVmsToGroupFilter } from "../../utils/groupFilters";

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
  const [changeGroupMembership, { isLoading: isSaving }] =
    useChangeGroupMembershipMutation();
  const {
    data: groups = [],
    isFetching: loading,
    isError: loadFailed,
  } = useGetAllGroupsQuery(undefined, { skip: !isOpen });
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const displayError = error ?? (loadFailed ? "Failed to load groups." : null);

  const vmCountLabel =
    vmIds.length === 1
      ? "1 selected virtual machine"
      : `${vmIds.length} selected virtual machines`;

  // Reset transient selection state whenever the modal opens.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedGroupId("");
    setIsGroupSelectOpen(false);
    setError(null);
  }, [isOpen]);

  // Auto-select when there is exactly one group to choose from.
  useEffect(() => {
    if (isOpen && groups.length === 1) {
      setSelectedGroupId(groups[0].id);
    }
  }, [isOpen, groups]);

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

    setError(null);
    try {
      await changeGroupMembership({
        groupId: selectedGroup.id,
        filter: addVmsToGroupFilter(selectedGroup.filter, vmIds),
      }).unwrap();
      onUpdated();
      onClose();
    } catch (err) {
      setError(getSdkErrorMessage(err, "Failed to add VMs to group."));
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
          <AppEmptyState
            titleText="No groups available"
            body="Create a group first."
            icon={DesktopIcon}
            variant={EmptyStateVariant.xs}
            wrapInBullseye={false}
          />
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

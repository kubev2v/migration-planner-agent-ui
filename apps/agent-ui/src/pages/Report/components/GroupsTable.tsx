import { css } from "@emotion/css";
import type { Group } from "@openshift-migration-advisor/agent-sdk";
import {
  Bullseye,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  MenuToggle,
  type MenuToggleElement,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import {
  DesktopIcon,
  EllipsisVIcon,
  FilterIcon,
} from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GroupLabelsCell } from "./GroupLabelsCell";

export interface GroupRow extends Group {
  vmCount: number;
  labels: string[];
}

const styles = {
  pageTitle: css`
    margin-bottom: 24px;
  `,
  toolbar: css`
    margin-bottom: 16px;
  `,
  nameLink: css`
    font-weight: 400;
  `,
};

function formatCreatedDate(date?: Date): string {
  if (!date) {
    return "—";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface GroupsTableProps {
  groups: GroupRow[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  nameFilter: string;
  selectedLabels: string[];
  availableLabels: string[];
  onNameFilterChange: (value: string) => void;
  onLabelsFilterChange: (labels: string[]) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onCreateGroup: () => void;
  onEditGroupName: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

export const GroupsTable: React.FC<GroupsTableProps> = ({
  groups,
  loading,
  total,
  page,
  pageSize,
  nameFilter,
  selectedLabels,
  availableLabels,
  onNameFilterChange,
  onLabelsFilterChange,
  onPageChange,
  onCreateGroup,
  onEditGroupName,
  onDeleteGroup,
}) => {
  const [isLabelsFilterOpen, setIsLabelsFilterOpen] = useState(false);
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null);

  const labelsFilterLabel = useMemo(() => {
    if (selectedLabels.length === 0) {
      return "Labels";
    }
    if (selectedLabels.length === 1) {
      return selectedLabels[0];
    }
    return `${selectedLabels.length} labels`;
  }, [selectedLabels]);

  const hasActiveFilters =
    nameFilter.trim().length > 0 || selectedLabels.length > 0;
  const showWelcomeEmpty =
    !loading && total === 0 && groups.length === 0 && !hasActiveFilters;

  return (
    <>
      <Title headingLevel="h1" size="2xl" className={styles.pageTitle}>
        Groups
      </Title>

      <Toolbar className={styles.toolbar}>
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <SearchInput
                placeholder="Filter by name"
                value={nameFilter}
                onChange={(_event, value) => onNameFilterChange(value)}
                onClear={() => onNameFilterChange("")}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Select
                role="menu"
                isOpen={isLabelsFilterOpen}
                selected={selectedLabels}
                onSelect={(_event, selection) => {
                  const label = String(selection);
                  onLabelsFilterChange(
                    selectedLabels.includes(label)
                      ? selectedLabels.filter((l) => l !== label)
                      : [...selectedLabels, label],
                  );
                }}
                onOpenChange={setIsLabelsFilterOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsLabelsFilterOpen((open) => !open)}
                    isExpanded={isLabelsFilterOpen}
                    icon={<FilterIcon />}
                  >
                    {labelsFilterLabel}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {availableLabels.length === 0 ? (
                    <SelectOption value="" isDisabled>
                      No labels available
                    </SelectOption>
                  ) : (
                    availableLabels.map((label) => (
                      <SelectOption
                        key={label}
                        value={label}
                        hasCheckbox
                        isSelected={selectedLabels.includes(label)}
                      >
                        {label}
                      </SelectOption>
                    ))
                  )}
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem>
            <Button variant="primary" onClick={onCreateGroup}>
              Create VM group
            </Button>
          </ToolbarItem>
          <ToolbarItem align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={total}
              perPage={pageSize}
              page={page}
              onSetPage={(_event, newPage) => onPageChange(newPage, pageSize)}
              onPerPageSelect={(_event, newPerPage) =>
                onPageChange(1, newPerPage)
              }
              variant="top"
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Table aria-label="VM groups" variant="compact">
        <Thead>
          <Tr>
            <Th>Group name</Th>
            <Th>Virtual machines</Th>
            <Th>Labels</Th>
            <Th>Created on</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {loading && groups.length === 0 ? (
            <Tr>
              <Td colSpan={5}>Loading groups...</Td>
            </Tr>
          ) : showWelcomeEmpty ? (
            <Tr>
              <Td colSpan={5}>
                <Bullseye>
                  <EmptyState
                    headingLevel="h2"
                    titleText="No virtual machine groups yet"
                    icon={DesktopIcon}
                    variant={EmptyStateVariant.sm}
                  >
                    <EmptyStateBody>
                      Create virtual machine groups to generate targeted
                      assessment reports and enhanced VM management.
                    </EmptyStateBody>
                    <EmptyStateFooter>
                      <EmptyStateActions>
                        <Button variant="primary" onClick={onCreateGroup}>
                          Create VM group
                        </Button>
                      </EmptyStateActions>
                    </EmptyStateFooter>
                  </EmptyState>
                </Bullseye>
              </Td>
            </Tr>
          ) : groups.length === 0 ? (
            <Tr>
              <Td colSpan={5}>No groups found.</Td>
            </Tr>
          ) : (
            groups.map((group) => (
              <Tr key={group.id}>
                <Td dataLabel="Group name">
                  <Link
                    to={`/report/groups/${group.id}`}
                    className={styles.nameLink}
                  >
                    {group.name}
                  </Link>
                </Td>
                <Td dataLabel="Virtual machines">{group.vmCount}</Td>
                <Td dataLabel="Labels">
                  <GroupLabelsCell labels={group.labels} />
                </Td>
                <Td dataLabel="Created on">
                  {formatCreatedDate(group.createdAt)}
                </Td>
                <Td isActionCell>
                  <Dropdown
                    isOpen={openMenuGroupId === group.id}
                    onOpenChange={(isOpen) =>
                      setOpenMenuGroupId(isOpen ? group.id : null)
                    }
                    onSelect={() => setOpenMenuGroupId(null)}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        variant="plain"
                        onClick={() =>
                          setOpenMenuGroupId((current) =>
                            current === group.id ? null : group.id,
                          )
                        }
                        isExpanded={openMenuGroupId === group.id}
                        aria-label={`Actions for ${group.name}`}
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                    popperProps={{ position: "right" }}
                  >
                    <DropdownList>
                      <DropdownItem
                        key="edit"
                        onClick={() => {
                          setOpenMenuGroupId(null);
                          onEditGroupName(group);
                        }}
                      >
                        Edit group name
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        onClick={() => {
                          setOpenMenuGroupId(null);
                          onDeleteGroup(group);
                        }}
                      >
                        Delete group
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </>
  );
};

GroupsTable.displayName = "GroupsTable";

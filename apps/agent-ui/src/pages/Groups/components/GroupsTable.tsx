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
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { DesktopIcon, EllipsisVIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AttributeValueFilter,
  type AttributeValueFilterAttribute,
  attributeValueFilterToolbarStyle,
} from "../../../common/components/attribute-value-filter";
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
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null);

  const clearAllFilters = () => {
    onNameFilterChange("");
    onLabelsFilterChange([]);
  };

  const filterAttributes = useMemo(
    (): AttributeValueFilterAttribute[] => [
      {
        id: "name",
        label: "Name",
        type: "text",
        value: nameFilter,
        onChange: onNameFilterChange,
        placeholder: "Filter by name",
        ariaLabel: "Filter by name",
      },
      {
        id: "labels",
        label: "Labels",
        type: "checkbox",
        options: availableLabels.map((label) => ({
          value: label,
          label,
        })),
        selections: selectedLabels,
        onSelectionsChange: onLabelsFilterChange,
      },
    ],
    [
      availableLabels,
      nameFilter,
      onLabelsFilterChange,
      onNameFilterChange,
      selectedLabels,
    ],
  );

  const hasActiveFilters =
    nameFilter.trim().length > 0 || selectedLabels.length > 0;
  const showWelcomeEmpty =
    !loading && total === 0 && groups.length === 0 && !hasActiveFilters;

  return (
    <>
      <Title headingLevel="h1" size="2xl" className={styles.pageTitle}>
        Groups
      </Title>

      <Toolbar
        className={`${styles.toolbar} ${attributeValueFilterToolbarStyle}`}
        clearAllFilters={clearAllFilters}
      >
        <ToolbarContent>
          <ToolbarGroup variant="filter-group">
            <ToolbarItem>
              <AttributeValueFilter attributes={filterAttributes} />
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
          {loading ? (
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

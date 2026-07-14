import { css } from "@emotion/css";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import {
  Bullseye,
  Button,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupsList } from "../../../Groups/components/GroupsList";
import type { VirtualMachineWithGroupItems } from "../../../Groups/utils/vmGroupMembership";
import { fetchApplicationDrawerVms } from "./applicationDrawerVms";
import { matchesSearch } from "./applicationFilters";
import type { ApplicationOverview } from "./applicationsApi";

const styles = {
  drawerPanel: css`
    min-width: 640px;
  `,
  toolbar: css`
    margin-bottom: 16px;
  `,
};

interface ApplicationVmsDrawerProps {
  application: ApplicationOverview;
  agentApi?: DefaultApiInterface;
  onClose: () => void;
  onNavigateToVm?: (vmId: string) => void;
  onViewInVmList?: (applicationName: string) => void;
  onAddLabels?: (vmIds: string[]) => void;
  onCreateGroup?: (vmIds: string[]) => void;
  onAddToGroup?: (vmIds: string[]) => void;
}

export const ApplicationVmsDrawer: React.FC<ApplicationVmsDrawerProps> = ({
  application,
  agentApi,
  onClose,
  onNavigateToVm,
  onViewInVmList,
  onAddLabels,
  onCreateGroup,
  onAddToGroup,
}) => {
  const [vmSearch, setVmSearch] = useState("");
  const [selectedVmIds, setSelectedVmIds] = useState<Set<string>>(new Set());
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [drawerVms, setDrawerVms] = useState<VirtualMachineWithGroupItems[]>(
    [],
  );
  const [loadingVms, setLoadingVms] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentApi) {
      setDrawerVms(
        application.vms.map((vm) => ({
          id: vm.id,
          name: vm.name,
          vCenterState: "",
          cluster: "",
          datacenter: "",
          diskSize: 0,
          memory: 0,
          issueCount: 0,
          migratable: false,
          groupItems: [],
        })),
      );
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingVms(true);
        setLoadError(null);
        const vms = await fetchApplicationDrawerVms(agentApi, application.name);
        if (!cancelled) {
          setDrawerVms(vms);
        }
      } catch (err) {
        console.error("Error loading application VMs:", err);
        if (!cancelled) {
          setDrawerVms([]);
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load virtual machines.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingVms(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [agentApi, application.name, application.vms]);

  const filteredVms = useMemo(() => {
    if (!vmSearch.trim()) {
      return drawerVms;
    }
    return drawerVms.filter((vm) => matchesSearch(vm.name, vmSearch));
  }, [drawerVms, vmSearch]);

  const selectedVmIdList = useMemo(
    () => Array.from(selectedVmIds),
    [selectedVmIds],
  );

  const toggleVmSelection = useCallback((vmId: string, isSelected: boolean) => {
    setSelectedVmIds((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(vmId);
      } else {
        next.delete(vmId);
      }
      return next;
    });
  }, []);

  const actionsLabel =
    selectedVmIds.size > 0 ? `Actions (${selectedVmIds.size})` : "Actions";

  return (
    <DrawerPanelContent className={styles.drawerPanel}>
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          VMs with {application.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Toolbar className={styles.toolbar}>
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <SearchInput
                  placeholder="Find by virtual machine name"
                  value={vmSearch}
                  onChange={(_event, value) => setVmSearch(value)}
                  onClear={() => setVmSearch("")}
                  style={{ minWidth: "240px" }}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={isActionsOpen}
                  onSelect={() => setIsActionsOpen(false)}
                  onOpenChange={setIsActionsOpen}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsActionsOpen((open) => !open)}
                      isExpanded={isActionsOpen}
                      variant="secondary"
                    >
                      {actionsLabel}
                    </MenuToggle>
                  )}
                  popperProps={{ position: "right" }}
                >
                  <DropdownList>
                    <DropdownItem
                      key="add-label"
                      isDisabled={selectedVmIds.size === 0 || !onAddLabels}
                      onClick={() => onAddLabels?.(selectedVmIdList)}
                    >
                      Add label
                    </DropdownItem>
                    <DropdownItem
                      key="create-group"
                      isDisabled={selectedVmIds.size === 0 || !onCreateGroup}
                      onClick={() => onCreateGroup?.(selectedVmIdList)}
                    >
                      Create group
                    </DropdownItem>
                    <DropdownItem
                      key="add-to-group"
                      isDisabled={selectedVmIds.size === 0 || !onAddToGroup}
                      onClick={() => onAddToGroup?.(selectedVmIdList)}
                    >
                      Add to group
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
            </ToolbarGroup>
            <ToolbarItem align={{ default: "alignEnd" }}>
              <Button
                variant="link"
                isInline
                onClick={() => onViewInVmList?.(application.name)}
              >
                View in VM list
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {loadError && (
          <EmptyState
            headingLevel="h3"
            titleText="Unable to load virtual machines"
            variant={EmptyStateVariant.sm}
            style={{ marginBottom: "16px" }}
          >
            <EmptyStateBody>{loadError}</EmptyStateBody>
          </EmptyState>
        )}

        {loadingVms ? (
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapSm" }}
          >
            <Spinner size="md" />
            <span>Loading virtual machines...</span>
          </Flex>
        ) : filteredVms.length === 0 ? (
          <Bullseye style={{ padding: "32px 0" }}>
            <EmptyState
              headingLevel="h3"
              titleText="No virtual machines match this search criteria"
              icon={SearchIcon}
              variant={EmptyStateVariant.sm}
            >
              <EmptyStateBody>
                Try a different search term or clear the search field.
              </EmptyStateBody>
            </EmptyState>
          </Bullseye>
        ) : (
          <Table
            aria-label={`Virtual machines running ${application.name}`}
            variant="compact"
          >
            <Thead>
              <Tr>
                <Th screenReaderText="Select" />
                <Th>Virtual machine name</Th>
                <Th>Labels</Th>
                <Th>Groups</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredVms.map((vm, rowIndex) => (
                <Tr key={vm.id}>
                  <Td
                    select={{
                      rowIndex,
                      onSelect: (_event, isSelected) =>
                        toggleVmSelection(vm.id, isSelected),
                      isSelected: selectedVmIds.has(vm.id),
                    }}
                  />
                  <Td dataLabel="Virtual machine name">
                    {onNavigateToVm ? (
                      <Button
                        variant="link"
                        isInline
                        onClick={() => onNavigateToVm(vm.id)}
                      >
                        {vm.name}
                      </Button>
                    ) : (
                      vm.name
                    )}
                  </Td>
                  <Td dataLabel="Labels">
                    {vm.labels && vm.labels.length > 0 ? (
                      <LabelGroup numLabels={3}>
                        {vm.labels.map((label) => (
                          <Label key={label} isCompact>
                            {label}
                          </Label>
                        ))}
                      </LabelGroup>
                    ) : (
                      "–"
                    )}
                  </Td>
                  <Td dataLabel="Groups">
                    {vm.groupItems.length > 0 ? (
                      <GroupsList groups={vm.groupItems} />
                    ) : (
                      "–"
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

ApplicationVmsDrawer.displayName = "ApplicationVmsDrawer";

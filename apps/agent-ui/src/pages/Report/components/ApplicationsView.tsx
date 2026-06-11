import { css } from "@emotion/css";
import {
  Alert,
  Bullseye,
  Button,
  Checkbox,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Dropdown,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  Pagination,
  SearchInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { FilterIcon, SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useMemo, useState } from "react";
import {
  buildVmLookup,
  filterApplications,
  filterVmsBySearch,
  getUniqueVms,
  getVmFilterLabel,
  paginateItems,
} from "./applicationFilters";
import type { ApplicationOverview } from "./applicationsApi";
import { TechnologyPreviewBadge } from "./TechnologyPreviewBadge";

const styles = {
  drawerPanel: css`
    min-width: 320px;
  `,
  vmList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  toolbar: css`
    margin-bottom: 16px;
  `,
  appliedFilters: css`
    margin-bottom: 16px;
  `,
  header: css`
    margin-bottom: 16px;
  `,
  vmFilterMenu: css`
    padding: 8px 16px 0;
  `,
  vmFilterList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 16px 16px;
    max-height: 300px;
    overflow-y: auto;
  `,
  vmFilterEmpty: css`
    padding: 8px 16px 16px;
    color: var(--pf-t--global--text--color--subtle);
  `,
};

interface ApplicationsViewProps {
  applications: ApplicationOverview[];
  loading?: boolean;
  error?: string | null;
  onNavigateToVm?: (vmId: string) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  loading = false,
  error = null,
  onNavigateToVm,
}) => {
  const [nameSearch, setNameSearch] = useState("");
  const [selectedVmIds, setSelectedVmIds] = useState<string[]>([]);
  const [isVmFilterOpen, setIsVmFilterOpen] = useState(false);
  const [vmFilterSearch, setVmFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerApplication, setDrawerApplication] =
    useState<ApplicationOverview | null>(null);
  const [drawerVmSearch, setDrawerVmSearch] = useState("");

  const vmById = useMemo(() => buildVmLookup(applications), [applications]);
  const allVms = useMemo(() => getUniqueVms(applications), [applications]);

  const filteredVmOptions = useMemo(
    () => filterVmsBySearch(allVms, vmFilterSearch),
    [allVms, vmFilterSearch],
  );

  const filteredApplications = useMemo(
    () =>
      filterApplications(applications, {
        nameSearch,
        vmIds: selectedVmIds,
      }),
    [applications, nameSearch, selectedVmIds],
  );

  const paginatedApplications = useMemo(
    () => paginateItems(filteredApplications, page, pageSize),
    [filteredApplications, page, pageSize],
  );

  const drawerVms = useMemo(() => {
    if (!drawerApplication) {
      return [];
    }
    return filterVmsBySearch(drawerApplication.vms, drawerVmSearch);
  }, [drawerApplication, drawerVmSearch]);

  const trimmedNameSearch = nameSearch.trim();
  const hasActiveFilters =
    trimmedNameSearch.length > 0 || selectedVmIds.length > 0;
  const vmFilterLabel = getVmFilterLabel(selectedVmIds, vmById);

  const resetPage = () => setPage(1);

  const closeDrawer = () => {
    setDrawerApplication(null);
    setDrawerVmSearch("");
  };

  const openDrawer = (application: ApplicationOverview) => {
    setDrawerApplication(application);
    setDrawerVmSearch("");
  };

  const applyNameSearch = (value: string) => {
    closeDrawer();
    setNameSearch(value);
    resetPage();
  };

  const toggleVmFilter = (vmId: string) => {
    closeDrawer();
    setSelectedVmIds((prev) =>
      prev.includes(vmId) ? prev.filter((id) => id !== vmId) : [...prev, vmId],
    );
    resetPage();
  };

  const clearAllFilters = () => {
    closeDrawer();
    setNameSearch("");
    setSelectedVmIds([]);
    resetPage();
  };

  const removeVmFilter = (vmId: string) => {
    closeDrawer();
    setSelectedVmIds((prev) => prev.filter((id) => id !== vmId));
    resetPage();
  };

  const panelContent = drawerApplication ? (
    <DrawerPanelContent className={styles.drawerPanel}>
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          VMs with {drawerApplication.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={closeDrawer} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <SearchInput
          placeholder="Find by virtual machine name"
          value={drawerVmSearch}
          onChange={(_event, value) => setDrawerVmSearch(value)}
          onClear={() => setDrawerVmSearch("")}
          style={{ marginBottom: "16px" }}
        />
        {drawerVms.length === 0 ? (
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
          <div className={styles.vmList}>
            {drawerVms.map((vm) => (
              <Button
                key={vm.id}
                variant="link"
                isInline
                onClick={() => onNavigateToVm?.(vm.id)}
              >
                {vm.name}
              </Button>
            ))}
          </div>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null;

  return (
    <Drawer isExpanded={drawerApplication !== null} isInline position="end">
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>
          <Flex
            className={styles.header}
            alignItems={{ default: "alignItemsCenter" }}
            spaceItems={{ default: "spaceItemsSm" }}
          >
            <FlexItem>
              <Title headingLevel="h2" size="lg">
                Applications
              </Title>
            </FlexItem>
            <FlexItem>
              <TechnologyPreviewBadge />
            </FlexItem>
          </Flex>

          {error && (
            <Alert
              variant="danger"
              title="Error loading applications"
              style={{ marginBottom: "16px" }}
            >
              {error}
            </Alert>
          )}

          <Toolbar className={styles.toolbar}>
            <ToolbarContent>
              <ToolbarGroup variant="filter-group">
                <ToolbarItem>
                  <SearchInput
                    placeholder="Find by application name"
                    value={nameSearch}
                    onChange={(_event, value) => applyNameSearch(value)}
                    onClear={() => applyNameSearch("")}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <Dropdown
                    isOpen={isVmFilterOpen}
                    onOpenChange={(open) => {
                      setIsVmFilterOpen(open);
                      if (!open) {
                        setVmFilterSearch("");
                      }
                    }}
                    isScrollable
                    maxMenuHeight="360px"
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsVmFilterOpen((open) => !open)}
                        isExpanded={isVmFilterOpen}
                        icon={<FilterIcon />}
                      >
                        {vmFilterLabel}
                      </MenuToggle>
                    )}
                  >
                    <div className={styles.vmFilterMenu}>
                      <SearchInput
                        placeholder="Type to filter VMs"
                        value={vmFilterSearch}
                        onChange={(_event, value) => setVmFilterSearch(value)}
                        onClear={() => setVmFilterSearch("")}
                      />
                    </div>
                    {filteredVmOptions.length === 0 ? (
                      <div className={styles.vmFilterEmpty}>
                        No virtual machines available
                      </div>
                    ) : (
                      <div className={styles.vmFilterList}>
                        {filteredVmOptions.map((vm) => (
                          <Checkbox
                            key={vm.id}
                            id={`applications-vm-filter-${vm.id}`}
                            label={vm.name}
                            isChecked={selectedVmIds.includes(vm.id)}
                            onChange={() => toggleVmFilter(vm.id)}
                          />
                        ))}
                      </div>
                    )}
                  </Dropdown>
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem align={{ default: "alignEnd" }}>
                <Pagination
                  itemCount={filteredApplications.length}
                  perPage={pageSize}
                  page={page}
                  onSetPage={(_event, newPage) => setPage(newPage)}
                  onPerPageSelect={(_event, newPerPage) => {
                    setPage(1);
                    setPageSize(newPerPage);
                  }}
                  variant="top"
                  isCompact
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>

          {hasActiveFilters && (
            <Toolbar className={styles.appliedFilters}>
              <ToolbarContent alignItems="center">
                <ToolbarItem>
                  <LabelGroup>
                    {trimmedNameSearch && (
                      <Label color="blue" onClose={() => applyNameSearch("")}>
                        {trimmedNameSearch}
                      </Label>
                    )}
                    {selectedVmIds.map((vmId) => (
                      <Label
                        key={vmId}
                        color="blue"
                        onClose={() => removeVmFilter(vmId)}
                      >
                        {vmById.get(vmId)?.name ?? vmId}
                      </Label>
                    ))}
                  </LabelGroup>
                </ToolbarItem>
                <ToolbarItem>
                  <Button variant="link" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          )}

          <Table aria-label="Applications" variant="compact">
            <Thead>
              <Tr>
                <Th>Application name</Th>
                <Th>VMs</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={2}>Loading applications...</Td>
                </Tr>
              ) : filteredApplications.length === 0 ? (
                <Tr>
                  <Td colSpan={2}>
                    {applications.length === 0
                      ? "No applications were detected on your virtual machines."
                      : "No applications match the current filters."}
                  </Td>
                </Tr>
              ) : (
                paginatedApplications.map((application) => (
                  <Tr key={application.name}>
                    <Td dataLabel="Application name">{application.name}</Td>
                    <Td dataLabel="VMs">
                      <Button
                        variant="link"
                        isInline
                        onClick={() => openDrawer(application)}
                      >
                        {application.vmCount}
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

ApplicationsView.displayName = "ApplicationsView";

import { css } from "@emotion/css";
import {
  Alert,
  Bullseye,
  Button,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Pagination,
  SearchInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  AttributeValueFilter,
  type AttributeValueFilterAttribute,
  attributeValueFilterToolbarStyle,
} from "../../../../common/components/attribute-value-filter";
import { TechnologyPreviewBadge } from "../../../../common/components/TechnologyPreviewBadge";
import {
  filterApplications,
  filterVmsBySearch,
  getUniqueVms,
  paginateItems,
} from "./applicationFilters";
import type { ApplicationOverview } from "./applicationsApi";

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
  header: css`
    margin-bottom: 16px;
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerApplication, setDrawerApplication] =
    useState<ApplicationOverview | null>(null);
  const [drawerVmSearch, setDrawerVmSearch] = useState("");

  const allVms = useMemo(() => getUniqueVms(applications), [applications]);

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

  const resetPage = useCallback(() => setPage(1), []);

  const closeDrawer = useCallback(() => {
    setDrawerApplication(null);
    setDrawerVmSearch("");
  }, []);

  const filterAttributes = useMemo(
    (): AttributeValueFilterAttribute[] => [
      {
        id: "name",
        label: "Name",
        type: "text",
        value: nameSearch,
        onChange: (value) => {
          closeDrawer();
          setNameSearch(value);
          resetPage();
        },
        placeholder: "Find by application name",
        ariaLabel: "Find by application name",
      },
      {
        id: "virtual-machine",
        label: "Virtual machine",
        type: "searchable-checkbox",
        options: allVms.map((vm) => ({
          value: vm.id,
          label: vm.name,
        })),
        selections: selectedVmIds,
        onSelectionsChange: (vmIds) => {
          closeDrawer();
          setSelectedVmIds(vmIds);
          resetPage();
        },
        searchPlaceholder: "Type to filter VMs",
        emptyMessage: "No virtual machines available",
      },
    ],
    [allVms, closeDrawer, nameSearch, resetPage, selectedVmIds],
  );

  const openDrawer = (application: ApplicationOverview) => {
    setDrawerApplication(application);
    setDrawerVmSearch("");
  };

  const clearAllFilters = () => {
    closeDrawer();
    setNameSearch("");
    setSelectedVmIds([]);
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

import {
  Alert,
  AlertActionCloseButton,
  Button,
  Content,
  ContentVariants,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Flex,
  FlexItem,
  Pagination,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { CloudServerIcon, SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { AppEmptyState } from "../../../../common/components";
import {
  AttributeValueFilter,
  type AttributeValueFilterAttribute,
  attributeValueFilterToolbarStyle,
} from "../../../../common/components/attribute-value-filter";
import { TechnologyPreviewBadge } from "../../../../common/components/TechnologyPreviewBadge";
import {
  useGetVMLabelsQuery,
  useUpdateVMLabelsMutation,
} from "../../../../store/api/vmsEndpoints";
import { AddLabelsModal } from "../../../Groups/components/modals/AddLabelsModal";
import { AddToGroupModal } from "../../../Groups/components/modals/AddToGroupModal";
import { CreateGroupFromSelectionModal } from "../../../Groups/components/modals/CreateGroupFromSelectionModal";
import { ApplianceConfidenceHelpPopover } from "./ApplianceConfidenceHelpPopover";
import { ApplicationVmsDrawer } from "./ApplicationVmsDrawer";
import {
  filterAppliances,
  getUniqueApplianceVendors,
  getUniqueApplianceVersions,
  getUniqueApplianceVms,
} from "./applianceFilters";
import type { ApplianceOverview } from "./appliancesApi";
import { applianceToDrawerApplication } from "./applianceToDrawer";
import {
  getApplianceVersionDisplay,
  getApplicationConfidenceDisplay,
  getApplicationVendorDisplay,
} from "./applicationDisplay";
import { paginateItems } from "./applicationFilters";

interface AppliancesViewProps {
  appliances: ApplianceOverview[];
  loading?: boolean;
  error?: string | null;
  agentApi?: DefaultApiInterface;
  vmScopeExpression?: string;
  selectedApplianceName?: string | null;
  onClearSelectedAppliance?: () => void;
  onNavigateToVm?: (vmId: string) => void;
  onViewInVmList?: (applianceName: string) => void;
}

export const AppliancesView: React.FC<AppliancesViewProps> = ({
  appliances,
  loading = false,
  error = null,
  agentApi,
  vmScopeExpression,
  selectedApplianceName = null,
  onClearSelectedAppliance,
  onNavigateToVm,
  onViewInVmList,
}) => {
  const [nameSearch, setNameSearch] = useState("");
  const [selectedVmIds, setSelectedVmIds] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerAppliance, setDrawerAppliance] =
    useState<ApplianceOverview | null>(null);
  const [isAddLabelsModalOpen, setIsAddLabelsModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
  const [actionVmIds, setActionVmIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: availableLabels = [] } = useGetVMLabelsQuery(undefined, {
    skip: !agentApi,
  });
  const [updateVMLabels] = useUpdateVMLabelsMutation();

  const allVms = useMemo(() => getUniqueApplianceVms(appliances), [appliances]);
  const vendorOptions = useMemo(
    () => getUniqueApplianceVendors(appliances),
    [appliances],
  );
  const versionOptions = useMemo(
    () => getUniqueApplianceVersions(appliances),
    [appliances],
  );

  const filteredAppliances = useMemo(
    () =>
      filterAppliances(appliances, {
        nameSearch,
        vmIds: selectedVmIds,
        vendors: selectedVendors,
        versions: selectedVersions,
      }),
    [appliances, nameSearch, selectedVmIds, selectedVendors, selectedVersions],
  );

  const paginatedAppliances = useMemo(
    () => paginateItems(filteredAppliances, page, pageSize),
    [filteredAppliances, page, pageSize],
  );

  const handleAddLabels = useCallback((vmIds: string[]) => {
    setActionError(null);
    setActionVmIds(vmIds);
    setIsAddLabelsModalOpen(true);
  }, []);

  const handleCreateGroup = useCallback((vmIds: string[]) => {
    setActionVmIds(vmIds);
    setIsCreateGroupModalOpen(true);
  }, []);

  const handleAddToGroup = useCallback((vmIds: string[]) => {
    setActionVmIds(vmIds);
    setIsAddToGroupModalOpen(true);
  }, []);

  const handleSubmitLabels = useCallback(
    async (labelsToAdd: string[], _labelsToRemove: string[]) => {
      if (!agentApi || actionVmIds.length === 0 || labelsToAdd.length === 0) {
        return;
      }

      setActionError(null);
      const results = await Promise.allSettled(
        labelsToAdd.map((label) =>
          updateVMLabels({ label, add: actionVmIds }).unwrap(),
        ),
      );

      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedCount > 0) {
        const message = `Failed to apply ${failedCount} of ${labelsToAdd.length} label(s).`;
        setActionError(message);
        throw new Error(message);
      }
    },
    [actionVmIds, agentApi, updateVMLabels],
  );

  const resetPage = useCallback(() => setPage(1), []);

  const closeDrawer = useCallback(() => {
    setDrawerAppliance(null);
    onClearSelectedAppliance?.();
  }, [onClearSelectedAppliance]);

  const filterAttributes = useMemo(
    (): AttributeValueFilterAttribute[] => [
      {
        id: "name",
        label: "Appliance name",
        type: "text",
        value: nameSearch,
        onChange: (value) => {
          closeDrawer();
          setNameSearch(value);
          resetPage();
        },
        placeholder: "Find by appliance name",
        ariaLabel: "Find by appliance name",
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
      {
        id: "vendor",
        label: "Vendor",
        type: "checkbox",
        options: vendorOptions.map((vendor) => ({
          value: vendor,
          label: vendor,
        })),
        selections: selectedVendors,
        onSelectionsChange: (vendors) => {
          closeDrawer();
          setSelectedVendors(vendors);
          resetPage();
        },
      },
      {
        id: "version",
        label: "Version",
        type: "checkbox",
        options: versionOptions.map((version) => ({
          value: version,
          label: version,
        })),
        selections: selectedVersions,
        onSelectionsChange: (versions) => {
          closeDrawer();
          setSelectedVersions(versions);
          resetPage();
        },
      },
    ],
    [
      allVms,
      closeDrawer,
      nameSearch,
      resetPage,
      selectedVersions,
      selectedVmIds,
      selectedVendors,
      vendorOptions,
      versionOptions,
    ],
  );

  useEffect(() => {
    if (!selectedApplianceName || loading) {
      return;
    }

    const appliance = appliances.find(
      (entry) => entry.name === selectedApplianceName,
    );
    if (appliance) {
      setDrawerAppliance(appliance);
    }
  }, [appliances, loading, selectedApplianceName]);

  const openDrawer = (appliance: ApplianceOverview) => {
    setDrawerAppliance(appliance);
  };

  const clearAllFilters = () => {
    closeDrawer();
    setNameSearch("");
    setSelectedVmIds([]);
    setSelectedVendors([]);
    setSelectedVersions([]);
    resetPage();
  };

  const panelContent = drawerAppliance ? (
    <ApplicationVmsDrawer
      key={drawerAppliance.name}
      application={applianceToDrawerApplication(drawerAppliance)}
      agentApi={agentApi}
      scopeExpression={vmScopeExpression}
      matchKind="appliance"
      onClose={closeDrawer}
      onNavigateToVm={onNavigateToVm}
      onViewInVmList={onViewInVmList}
      onAddLabels={agentApi ? handleAddLabels : undefined}
      onCreateGroup={agentApi ? handleCreateGroup : undefined}
      onAddToGroup={agentApi ? handleAddToGroup : undefined}
    />
  ) : null;

  return (
    <>
      <Drawer isExpanded={drawerAppliance !== null} isInline position="end">
        <DrawerContent panelContent={panelContent}>
          <DrawerContentBody>
            <Stack hasGutter>
              <StackItem>
                <Flex
                  alignItems={{ default: "alignItemsCenter" }}
                  spaceItems={{ default: "spaceItemsSm" }}
                >
                  <FlexItem>
                    <Content component={ContentVariants.h2}>Appliances</Content>
                  </FlexItem>
                  <FlexItem>
                    <TechnologyPreviewBadge />
                  </FlexItem>
                </Flex>
                <Content component={ContentVariants.p}>
                  Virtual appliances detected from VMware vApp product metadata
                  and guest inspection.
                </Content>
              </StackItem>

              {error && (
                <StackItem>
                  <Alert
                    variant="danger"
                    title="Error loading appliances"
                    style={{ marginBottom: "16px" }}
                  >
                    {error}
                  </Alert>
                </StackItem>
              )}
              {actionError && (
                <StackItem>
                  <Alert
                    variant="danger"
                    title="Label update failed"
                    isInline
                    style={{ marginBottom: "16px" }}
                    actionClose={
                      <AlertActionCloseButton
                        onClose={() => setActionError(null)}
                      />
                    }
                  >
                    {actionError}
                  </Alert>
                </StackItem>
              )}

              <StackItem>
                <Toolbar
                  className={attributeValueFilterToolbarStyle}
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
                        itemCount={filteredAppliances.length}
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

                <Table aria-label="Appliances" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Appliance name</Th>
                      <Th>Vendor</Th>
                      <Th>Version</Th>
                      <Th>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          Confidence
                          <ApplianceConfidenceHelpPopover />
                        </span>
                      </Th>
                      <Th>VMs</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {loading ? (
                      <Tr>
                        <Td colSpan={5}>Loading appliances...</Td>
                      </Tr>
                    ) : filteredAppliances.length === 0 ? (
                      <Tr>
                        <Td colSpan={5}>
                          <AppEmptyState
                            titleText={
                              appliances.length === 0
                                ? "No virtual appliances were detected on your virtual machines"
                                : "No appliances match the current filters"
                            }
                            body={
                              appliances.length === 0
                                ? "Appliances are identified from vApp product metadata during virtual machine inspection."
                                : "Try adjusting your filters or search criteria."
                            }
                            icon={
                              appliances.length === 0
                                ? CloudServerIcon
                                : SearchIcon
                            }
                          />
                        </Td>
                      </Tr>
                    ) : (
                      paginatedAppliances.map((appliance) => (
                        <Tr key={appliance.name}>
                          <Td dataLabel="Appliance name">{appliance.name}</Td>
                          <Td dataLabel="Vendor">
                            {getApplicationVendorDisplay(appliance)}
                          </Td>
                          <Td dataLabel="Version">
                            {getApplianceVersionDisplay(appliance.version)}
                          </Td>
                          <Td dataLabel="Confidence">
                            {getApplicationConfidenceDisplay(appliance)}
                          </Td>
                          <Td dataLabel="VMs">
                            <Button
                              variant="link"
                              isInline
                              onClick={() => openDrawer(appliance)}
                            >
                              {appliance.vmCount}
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </StackItem>
            </Stack>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>

      <AddLabelsModal
        isOpen={isAddLabelsModalOpen}
        onClose={() => {
          setIsAddLabelsModalOpen(false);
          setActionError(null);
        }}
        onSubmit={handleSubmitLabels}
        selectedVMCount={actionVmIds.length}
        existingLabels={availableLabels}
        currentVMLabels={[]}
        mode="add"
      />
      {agentApi && (
        <>
          <CreateGroupFromSelectionModal
            isOpen={isCreateGroupModalOpen}
            vmIds={actionVmIds}
            onClose={() => setIsCreateGroupModalOpen(false)}
          />
          <AddToGroupModal
            isOpen={isAddToGroupModalOpen}
            vmIds={actionVmIds}
            onClose={() => setIsAddToGroupModalOpen(false)}
          />
        </>
      )}
    </>
  );
};

AppliancesView.displayName = "AppliancesView";

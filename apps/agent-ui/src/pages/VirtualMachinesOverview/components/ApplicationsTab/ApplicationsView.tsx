import { css } from "@emotion/css";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Flex,
  FlexItem,
  Pagination,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AttributeValueFilter,
  type AttributeValueFilterAttribute,
  attributeValueFilterToolbarStyle,
} from "../../../../common/components/attribute-value-filter";
import { TechnologyPreviewBadge } from "../../../../common/components/TechnologyPreviewBadge";
import { AddLabelsModal } from "../../../Groups/components/modals/AddLabelsModal";
import { AddToGroupModal } from "../../../Groups/components/modals/AddToGroupModal";
import { CreateGroupFromSelectionModal } from "../../../Groups/components/modals/CreateGroupFromSelectionModal";
import { invalidateAllGroupsCache } from "../../../Groups/utils/groupList";
import { ApplicationVmsDrawer } from "./ApplicationVmsDrawer";
import {
  type ApplicationCertificationStatus,
  CERTIFICATION_STATUS_FILTER_OPTIONS,
  CERTIFICATION_STATUS_TOOLTIP,
  getApplicationCertificationStatus,
  getCertificationStatusLabel,
} from "./applicationCertification";
import {
  filterApplications,
  getUniqueVms,
  paginateItems,
} from "./applicationFilters";
import type { ApplicationOverview } from "./applicationsApi";

const styles = {
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
  agentApi?: DefaultApiInterface;
  selectedApplicationName?: string | null;
  onClearSelectedApplication?: () => void;
  onNavigateToVm?: (vmId: string) => void;
  onViewInVmList?: (applicationName: string) => void;
  onRefreshApplications?: () => void | Promise<void>;
  onRefreshFilterOptions?: () => void | Promise<void>;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  loading = false,
  error = null,
  agentApi,
  selectedApplicationName = null,
  onClearSelectedApplication,
  onNavigateToVm,
  onViewInVmList,
  onRefreshApplications,
  onRefreshFilterOptions,
}) => {
  const [nameSearch, setNameSearch] = useState("");
  const [selectedVmIds, setSelectedVmIds] = useState<string[]>([]);
  const [selectedCertificationStatuses, setSelectedCertificationStatuses] =
    useState<ApplicationCertificationStatus[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerApplication, setDrawerApplication] =
    useState<ApplicationOverview | null>(null);
  const [drawerRefreshKey, setDrawerRefreshKey] = useState(0);
  const [isAddLabelsModalOpen, setIsAddLabelsModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
  const [actionVmIds, setActionVmIds] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const allVms = useMemo(() => getUniqueVms(applications), [applications]);

  const filteredApplications = useMemo(
    () =>
      filterApplications(applications, {
        nameSearch,
        vmIds: selectedVmIds,
        certificationStatuses: selectedCertificationStatuses,
      }),
    [applications, nameSearch, selectedVmIds, selectedCertificationStatuses],
  );

  const paginatedApplications = useMemo(
    () => paginateItems(filteredApplications, page, pageSize),
    [filteredApplications, page, pageSize],
  );

  const fetchAvailableLabels = useCallback(async () => {
    if (!agentApi) {
      return;
    }
    try {
      const data = await agentApi.getVMLabels();
      setAvailableLabels(data.labels ?? []);
    } catch (err) {
      console.error("Error fetching labels:", err);
    }
  }, [agentApi]);

  useEffect(() => {
    void fetchAvailableLabels();
  }, [fetchAvailableLabels]);

  const refreshDrawerData = useCallback(async () => {
    setDrawerRefreshKey((key) => key + 1);
    await onRefreshApplications?.();
  }, [onRefreshApplications]);

  const handleGroupsChanged = useCallback(async () => {
    if (agentApi) {
      invalidateAllGroupsCache(agentApi);
    }
    await onRefreshFilterOptions?.();
    await refreshDrawerData();
  }, [agentApi, onRefreshFilterOptions, refreshDrawerData]);

  const handleAddLabels = useCallback(
    (vmIds: string[]) => {
      setActionError(null);
      setActionVmIds(vmIds);
      void fetchAvailableLabels();
      setIsAddLabelsModalOpen(true);
    },
    [fetchAvailableLabels],
  );

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
          agentApi.updateLabelVMs({
            label,
            updateLabelVMsRequest: { add: actionVmIds },
          }),
        ),
      );

      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;
      if (failedCount > 0) {
        setActionError(
          `Failed to apply ${failedCount} of ${labelsToAdd.length} label(s).`,
        );
      }

      await fetchAvailableLabels();
      await refreshDrawerData();
    },
    [actionVmIds, agentApi, fetchAvailableLabels, refreshDrawerData],
  );

  const resetPage = useCallback(() => setPage(1), []);

  const closeDrawer = useCallback(() => {
    setDrawerApplication(null);
    onClearSelectedApplication?.();
  }, [onClearSelectedApplication]);

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
      {
        id: "certification-status",
        label: "Certification status",
        type: "checkbox",
        options: CERTIFICATION_STATUS_FILTER_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        })),
        selections: selectedCertificationStatuses,
        onSelectionsChange: (statuses) => {
          closeDrawer();
          setSelectedCertificationStatuses(
            statuses as ApplicationCertificationStatus[],
          );
          resetPage();
        },
      },
    ],
    [
      allVms,
      closeDrawer,
      nameSearch,
      resetPage,
      selectedCertificationStatuses,
      selectedVmIds,
    ],
  );

  useEffect(() => {
    if (!selectedApplicationName || loading) {
      return;
    }

    const application = applications.find(
      (entry) => entry.name === selectedApplicationName,
    );
    if (application) {
      setDrawerApplication(application);
    }
  }, [applications, loading, selectedApplicationName]);

  const openDrawer = (application: ApplicationOverview) => {
    setDrawerApplication(application);
  };

  const clearAllFilters = () => {
    closeDrawer();
    setNameSearch("");
    setSelectedVmIds([]);
    setSelectedCertificationStatuses([]);
    resetPage();
  };

  const panelContent = drawerApplication ? (
    <ApplicationVmsDrawer
      key={`${drawerApplication.name}:${drawerRefreshKey}`}
      application={drawerApplication}
      agentApi={agentApi}
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
            {actionError && (
              <Alert
                variant="danger"
                title="Label update failed"
                style={{ marginBottom: "16px" }}
              >
                {actionError}
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
                  <Th>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Certification status
                      <Tooltip content={CERTIFICATION_STATUS_TOOLTIP}>
                        <Button
                          variant="plain"
                          aria-label="Certification status information"
                          style={{ padding: 0, minHeight: "auto" }}
                        >
                          <InfoCircleIcon />
                        </Button>
                      </Tooltip>
                    </span>
                  </Th>
                  <Th>VMs</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={3}>Loading applications...</Td>
                  </Tr>
                ) : filteredApplications.length === 0 ? (
                  <Tr>
                    <Td colSpan={3}>
                      {applications.length === 0
                        ? "No applications were detected on your virtual machines."
                        : "No applications match the current filters."}
                    </Td>
                  </Tr>
                ) : (
                  paginatedApplications.map((application) => (
                    <Tr key={application.name}>
                      <Td dataLabel="Application name">{application.name}</Td>
                      <Td dataLabel="Certification status">
                        {getCertificationStatusLabel(
                          getApplicationCertificationStatus(application.name),
                        )}
                      </Td>
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

      <AddLabelsModal
        isOpen={isAddLabelsModalOpen}
        onClose={() => setIsAddLabelsModalOpen(false)}
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
            onCreated={handleGroupsChanged}
          />
          <AddToGroupModal
            isOpen={isAddToGroupModalOpen}
            vmIds={actionVmIds}
            onClose={() => setIsAddToGroupModalOpen(false)}
            onUpdated={handleGroupsChanged}
          />
        </>
      )}
    </>
  );
};

ApplicationsView.displayName = "ApplicationsView";

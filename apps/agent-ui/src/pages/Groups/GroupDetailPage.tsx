import {
  type Group,
  ResponseError,
  type VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { useInjection } from "@openshift-migration-advisor/ioc";
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Content,
  ContentVariants,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from "@patternfly/react-core";
import { InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { DefaultApiInterface } from "../../api/agentApi";
import { AppEmptyState } from "../../common/components";
import { DiscoveryStatus } from "../../common/DiscoveryStatus";
import { Symbols } from "../../main/Symbols";
import {
  buildClusterViewModel,
  type ClusterOption,
} from "../VirtualMachinesOverview/clusterView";
import { ApplicationsView } from "../VirtualMachinesOverview/components/ApplicationsTab/ApplicationsView";
import { Dashboard } from "../VirtualMachinesOverview/components/Dashboard/Dashboard";
import { VirtualMachinesView } from "../VirtualMachinesOverview/components/VirtualMachinesTab/VirtualMachinesView";
import { createRefreshVmTableFilterOptions } from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmFilterOptions";
import {
  filtersToByExpression,
  filtersToSearchParams,
  hasActiveFilters,
  searchParamsToFilters,
  type VMFilters,
  withDefaultReportInclusion,
} from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmFilters";
import type { VMTableFilterOptions } from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmTableTypes";
import { Header } from "../VirtualMachinesOverview/Header";
import {
  getInventoryAggregateView,
  type InventoryPayload,
  inventoryFromGroupResponse,
  type MigrationExcludedInventoryChange,
} from "../VirtualMachinesOverview/inventoryParsing";
import {
  buildApplicationsTabUrl,
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  clearVmFilterParams,
  REPORT_TAB,
  resolveReportTab,
} from "../VirtualMachinesOverview/reportTabNavigation";
import { useApplicationsData } from "../VirtualMachinesOverview/useApplicationsData";
import { useMigrationInventoryRefresh } from "../VirtualMachinesOverview/useMigrationInventoryRefresh";
import { normalizeVirtualMachines } from "../VirtualMachinesOverview/virtualMachineParsing";
import { DeleteGroupModal } from "./components/modals/DeleteGroupModal";
import { EditGroupNameModal } from "./components/modals/EditGroupNameModal";
import { combineFilterExpressions } from "./utils/groupFilters";

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [searchParams, setSearchParams] = useSearchParams();

  const [group, setGroup] = useState<Group | null>(null);
  const [inventory, setInventory] = useState<InventoryPayload | null>(null);
  const [vmsList, setVmsList] = useState<VirtualMachine[]>([]);
  const [vmsLoading, setVmsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [vmsTotalCount, setVmsTotalCount] = useState(0);
  const [vmsPage, setVmsPage] = useState(1);
  const [vmsPageSize, setVmsPageSize] = useState(20);
  const [vmsSortFields, setVmsSortFields] = useState<string[]>([]);
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [availableFilterOptions, setAvailableFilterOptions] =
    useState<VMTableFilterOptions>({
      clusters: [],
      datacenters: [],
      concernLabels: [],
      concernCategories: [],
      vmLabels: [],
      groups: [],
      applications: [],
    });
  const [filterOptionsFetched, setFilterOptionsFetched] = useState(false);

  const refreshFilterOptions = useMemo(
    () =>
      createRefreshVmTableFilterOptions(agentApi, setAvailableFilterOptions),
    [agentApi],
  );

  const vmsRequestIdRef = useRef(0);
  const vmsRefreshIdRef = useRef(0);

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  const [activeTab, setActiveTab] = useState<string | number>(() =>
    resolveReportTab(searchParams, hasActiveFilters(initialVMFilters)),
  );

  const handleNavigateToVMFilters = useCallback(
    (filters: VMFilters) => {
      setActiveTab(REPORT_TAB.vms);
      setVmsPage(1);
      const newParams = filtersToSearchParams(filters);
      newParams.set("tab", "vms");
      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams],
  );

  const groupFilter = group?.filter;

  const {
    applications: applicationsList,
    loading: applicationsLoading,
    error: applicationsError,
    refreshApplications,
  } = useApplicationsData(
    agentApi,
    activeTab === REPORT_TAB.applications,
    groupFilter,
  );

  useEffect(() => {
    const nextTab = resolveReportTab(
      searchParams,
      hasActiveFilters(searchParamsToFilters(searchParams)),
    );
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (!groupId) {
      setError("Group not found.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await agentApi.getLatestGroup({
          groupId,
          page: 1,
          pageSize: 1,
        });

        setGroup(response.group);
        setVmsTotalCount(response.total ?? 0);
        setInventory(inventoryFromGroupResponse(response));
      } catch (err) {
        console.error("Error loading group detail:", err);
        if (err instanceof ResponseError && err.response?.status === 404) {
          setError("Group not found.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load group.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentApi, groupId]);

  useEffect(() => {
    if (activeTab !== REPORT_TAB.vms || filterOptionsFetched) {
      return;
    }

    const fetchFilterOptions = async () => {
      try {
        await refreshFilterOptions();
        setFilterOptionsFetched(true);
      } catch (err) {
        console.error("Error fetching filter options:", err);
        setFilterOptionsFetched(true);
      }
    };

    fetchFilterOptions();
  }, [activeTab, filterOptionsFetched, refreshFilterOptions]);

  useEffect(() => {
    if (activeTab !== REPORT_TAB.vms || !groupFilter) {
      return;
    }

    const fetchVMs = async () => {
      vmsRequestIdRef.current += 1;
      const currentRequestId = vmsRequestIdRef.current;

      try {
        setVmsLoading(true);
        const userExpression = filtersToByExpression(
          withDefaultReportInclusion(initialVMFilters),
        );
        const byExpression = combineFilterExpressions(
          groupFilter,
          userExpression,
        );

        const response = await agentApi.listLatestVirtualMachines({
          byExpression,
          sort: vmsSortFields.length > 0 ? vmsSortFields : undefined,
          page: vmsPage,
          pageSize: vmsPageSize,
        });

        if (currentRequestId === vmsRequestIdRef.current) {
          setVmsList(normalizeVirtualMachines(response.virtualMachines));
          setVmsTotalCount(response.total || 0);
        }
      } catch (err) {
        console.error("Error fetching group VMs:", err);
        if (currentRequestId === vmsRequestIdRef.current) {
          setVmsList([]);
          setVmsTotalCount(0);
        }
      } finally {
        if (currentRequestId === vmsRequestIdRef.current) {
          setVmsLoading(false);
        }
      }
    };

    fetchVMs();
  }, [
    activeTab,
    agentApi,
    groupFilter,
    initialVMFilters,
    vmsPage,
    vmsPageSize,
    vmsSortFields,
  ]);

  const refreshVMs = useCallback(async () => {
    if (!groupFilter) {
      return;
    }
    const reqId = ++vmsRefreshIdRef.current;
    try {
      const userExpression = filtersToByExpression(
        withDefaultReportInclusion(initialVMFilters),
      );
      const byExpression = combineFilterExpressions(
        groupFilter,
        userExpression,
      );
      const [response, labelsResponse] = await Promise.all([
        agentApi.listLatestVirtualMachines({
          byExpression,
          sort: vmsSortFields.length > 0 ? vmsSortFields : undefined,
          page: vmsPage,
          pageSize: vmsPageSize,
        }),
        agentApi.getLatestVMLabels().catch(() => null),
      ]);
      if (vmsRefreshIdRef.current === reqId) {
        setVmsList(normalizeVirtualMachines(response.virtualMachines));
        setVmsTotalCount(response.total || 0);
        setAvailableFilterOptions((prev) => ({
          ...prev,
          vmLabels: labelsResponse?.labels ?? prev.vmLabels,
        }));
      }
    } catch (err) {
      console.error("Error refreshing group VMs:", err);
    }
  }, [
    agentApi,
    groupFilter,
    initialVMFilters,
    vmsSortFields,
    vmsPage,
    vmsPageSize,
  ]);

  const bumpInventoryRevision = useCallback(() => {
    setInventoryRevision((revision) => revision + 1);
  }, []);

  const { refreshInventory: refreshGroupInventoryBase } =
    useMigrationInventoryRefresh({
      agentApi,
      groupId,
      setInventory,
      setVmsList,
    });

  const refreshGroupInventory = useCallback(
    async (change: MigrationExcludedInventoryChange) => {
      await refreshGroupInventoryBase(change);
      bumpInventoryRevision();
    },
    [refreshGroupInventoryBase, bumpInventoryRevision],
  );

  const reloadGroupMembership = useCallback(async () => {
    if (!groupId) {
      return;
    }

    try {
      const response = await agentApi.getLatestGroup({
        groupId,
        page: 1,
        pageSize: 1,
      });
      setGroup(response.group);
      setVmsTotalCount(response.total ?? 0);
      setVmsPage(1);
      bumpInventoryRevision();
    } catch (err) {
      console.error("Error reloading group after membership change:", err);
    }
  }, [agentApi, groupId, bumpInventoryRevision]);

  const handleTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setActiveTab(tabIndex);
    let newParams: URLSearchParams;
    if (tabIndex === REPORT_TAB.vms) {
      newParams = buildVmsTabUrl(searchParams);
      setVmsPage(1);
    } else if (tabIndex === REPORT_TAB.applications) {
      newParams = buildApplicationsTabUrl(searchParams);
    } else {
      newParams = buildOverviewTabUrl(searchParams);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleNavigateToVm = (vmId: string) => {
    setActiveTab(REPORT_TAB.vms);
    setSearchParams(buildVmDetailUrl(searchParams, vmId), { replace: true });
    setVmsPage(1);
  };

  const handleClearSelectedApplication = useCallback(() => {
    setSearchParams(buildApplicationsTabUrl(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);

  const selectedApplicationName = searchParams.get("application");

  const handleViewApplicationInVmList = useCallback(
    (applicationName: string) => {
      handleNavigateToVMFilters({ applications: [applicationName] });
    },
    [handleNavigateToVMFilters],
  );

  const handleConcernClick = useCallback(
    (concernLabel: string) => {
      handleNavigateToVMFilters({ concernLabels: [concernLabel] });
    },
    [handleNavigateToVMFilters],
  );

  const handleClusterSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ): void => {
    if (typeof value === "string") {
      setSelectedClusterId(value);
      setActiveTab(REPORT_TAB.overview);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("tab");
      newParams.delete("vmId");
      clearVmFilterParams(newParams);
      setSearchParams(newParams, { replace: true });
    }
    setIsClusterSelectOpen(false);
  };

  const handleUpdateGroupName = async (name: string) => {
    if (!group) {
      return;
    }
    const updated = await agentApi.updateLatestGroup({
      groupId: group.id,
      updateGroupRequest: { name },
    });
    setGroup(updated);
  };

  const handleDeleteGroup = async () => {
    if (!group) {
      return;
    }
    await agentApi.deleteLatestGroup({ groupId: group.id });
    navigate("/report/groups");
  };

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <AppEmptyState
          titleText="Loading group"
          icon={Spinner}
          bullseyeStyle={{ minHeight: "240px" }}
        />
      </PageSection>
    );
  }

  if (error || !group) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Alert variant="danger" title="Unable to load group">
          {error || "Group not found."}
        </Alert>
        <Link to="/report/groups">Back to groups</Link>
      </PageSection>
    );
  }

  const aggregateView = getInventoryAggregateView(inventory);
  const totalVMs = aggregateView.vms?.total ?? vmsTotalCount ?? 0;
  const totalClusters = Object.keys(aggregateView.clusters).length;

  const clusterView = buildClusterViewModel({
    infra: aggregateView.infra,
    vms: aggregateView.vms,
    clusters: aggregateView.clusters,
    selectedClusterId,
  });

  const clusterSelectDisabled = clusterView.clusterOptions.length <= 1;
  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <Stack hasGutter>
        <StackItem>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to="/report/groups">Groups</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{group.name}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>

        <StackItem>
          <Flex
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsFlexStart" }}
            gap={{ default: "gapMd" }}
          >
            <FlexItem>
              <Content component={ContentVariants.h1}>{group.name}</Content>
            </FlexItem>
            <FlexItem>
              <Dropdown
                isOpen={isActionsOpen}
                onOpenChange={setIsActionsOpen}
                onSelect={() => setIsActionsOpen(false)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsActionsOpen((open) => !open)}
                    isExpanded={isActionsOpen}
                  >
                    Actions
                  </MenuToggle>
                )}
                popperProps={{ position: "right" }}
              >
                <DropdownList>
                  <DropdownItem
                    key="edit"
                    onClick={() => {
                      setIsEditModalOpen(true);
                      setIsActionsOpen(false);
                    }}
                  >
                    Edit group name
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setIsActionsOpen(false);
                    }}
                  >
                    Delete group
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>
        </StackItem>

        <StackItem>
          <DiscoveryStatus />
        </StackItem>

        <StackItem>
          <Select
            isScrollable
            isOpen={isClusterSelectOpen}
            selected={clusterView.selectionId}
            onSelect={handleClusterSelect}
            onOpenChange={(isOpen: boolean) => {
              if (!clusterSelectDisabled) setIsClusterSelectOpen(isOpen);
            }}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                isExpanded={isClusterSelectOpen}
                onClick={() => {
                  if (!clusterSelectDisabled) {
                    setIsClusterSelectOpen((prev) => !prev);
                  }
                }}
                isDisabled={clusterSelectDisabled}
                style={{ minWidth: "422px" }}
              >
                {clusterView.selectionLabel}
              </MenuToggle>
            )}
          >
            <SelectList>
              {clusterView.clusterOptions.map((option: ClusterOption) => (
                <SelectOption key={option.id} value={option.id}>
                  {option.label}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </StackItem>

        <StackItem>
          <Header totalVMs={totalVMs} totalClusters={totalClusters} />
        </StackItem>

        <StackItem>
          <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
            <Tab
              eventKey={REPORT_TAB.overview}
              title={<TabTitleText>Assessment report</TabTitleText>}
            >
              <div style={{ marginTop: "24px" }}>
                <Title headingLevel="h2" size="lg">
                  Report for {group.name} group
                </Title>
                <Content component="p" style={{ marginTop: "8px" }}>
                  This report is based on all the virtual machines inside this
                  group, except those marked as excluded from reports.
                </Content>
                {clusterView.viewInfra && clusterView.viewVms ? (
                  <div style={{ marginTop: "24px" }}>
                    <Dashboard
                      key={`group-assessment-${inventoryRevision}-${clusterView.viewVms.total ?? 0}-${clusterView.selectionId}`}
                      infra={clusterView.viewInfra}
                      cpuCores={clusterView.cpuCores}
                      ramGB={clusterView.ramGB}
                      vms={clusterView.viewVms}
                      clusters={clusterView.viewClusters}
                      isAggregateView={clusterView.isAggregateView}
                      clusterFound={clusterView.clusterFound}
                      onConcernClick={handleConcernClick}
                      onNavigateToVMFilters={handleNavigateToVMFilters}
                    />
                  </div>
                ) : (
                  <AppEmptyState
                    titleText="No assessment data is available for this group yet"
                    body="Assessment data will appear here once virtual machines in this group have been inventoried."
                    icon={InboxIcon}
                    bullseyeStyle={{ minHeight: "240px", marginTop: "16px" }}
                  />
                )}
              </div>
            </Tab>
            <Tab
              eventKey={REPORT_TAB.vms}
              title={<TabTitleText>Virtual machines</TabTitleText>}
            >
              <div style={{ marginTop: "24px" }}>
                <VirtualMachinesView
                  vms={vmsList}
                  loading={vmsLoading}
                  initialFilters={initialVMFilters}
                  totalVMs={vmsTotalCount}
                  currentPage={vmsPage}
                  pageSize={vmsPageSize}
                  onFiltersChange={() => setVmsPage(1)}
                  onPageChange={(page, pageSize) => {
                    setVmsPage(page);
                    setVmsPageSize(pageSize);
                  }}
                  onSortChange={setVmsSortFields}
                  availableFilterOptions={availableFilterOptions}
                  agentApi={agentApi}
                  onRefreshVMs={refreshVMs}
                  onRefreshInventory={refreshGroupInventory}
                  onGroupMembershipChanged={reloadGroupMembership}
                  onRefreshFilterOptions={refreshFilterOptions}
                  groupContext={{ id: group.id, name: group.name }}
                  scopedFilterExpression={group.filter}
                  sortFields={vmsSortFields}
                />
              </div>
            </Tab>
            <Tab
              eventKey={REPORT_TAB.applications}
              title={<TabTitleText>Applications</TabTitleText>}
            >
              <div style={{ marginTop: "24px" }}>
                <ApplicationsView
                  applications={applicationsList}
                  loading={applicationsLoading}
                  error={applicationsError}
                  agentApi={agentApi}
                  selectedApplicationName={selectedApplicationName}
                  onClearSelectedApplication={handleClearSelectedApplication}
                  onNavigateToVm={handleNavigateToVm}
                  onViewInVmList={handleViewApplicationInVmList}
                  onRefreshApplications={refreshApplications}
                  onRefreshFilterOptions={refreshFilterOptions}
                />
              </div>
            </Tab>
          </Tabs>
        </StackItem>
      </Stack>

      <EditGroupNameModal
        isOpen={isEditModalOpen}
        group={group}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateGroupName}
      />

      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        group={group}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteGroup}
      />
    </PageSection>
  );
};

GroupDetailPage.displayName = "GroupDetailPage";

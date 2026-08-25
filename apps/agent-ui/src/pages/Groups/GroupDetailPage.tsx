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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { DefaultApiInterface } from "../../api/agentApi";
import { AppEmptyState } from "../../common/components";
import { DiscoveryStatus } from "../../common/DiscoveryStatus";
import { useReportsContext } from "../../common/report/ReportsContext";
import { Symbols } from "../../main/Symbols";
import { agentApiSlice } from "../../store/api/agentApiSlice";
import {
  useDeleteGroupMutation,
  useGetGroupQuery,
  useGetGroupVMsQuery,
  useUpdateGroupNameMutation,
} from "../../store/api/groupsEndpoints";
import { useAppDispatch } from "../../store/hooks";
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
  inventoryFromGroupResponse,
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
import { normalizeVirtualMachines } from "../VirtualMachinesOverview/virtualMachineParsing";
import { DeleteGroupModal } from "./components/modals/DeleteGroupModal";
import { EditGroupNameModal } from "./components/modals/EditGroupNameModal";
import { invalidateAllGroupsCache } from "./utils/groupList";

/** Extract a human-readable message from an RTK Query / SDK error. */
function getGroupErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { status?: number; message?: string };
    if (candidate.status === 404) {
      return "Group not found.";
    }
    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }
  return "Failed to load group.";
}

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [vmsPage, setVmsPage] = useState(1);
  const [vmsPageSize, setVmsPageSize] = useState(20);
  const [vmsSortFields, setVmsSortFields] = useState<string[]>([]);
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

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  const [activeTab, setActiveTab] = useState<string | number>(() =>
    resolveReportTab(searchParams, hasActiveFilters(initialVMFilters)),
  );

  // --- Group (header source) ------------------------------------------------
  // The GroupResponse carries `inventory`, `total` and `group`; the header VM
  // count derives from this single cache entry.
  const {
    data: groupData,
    isLoading: loading,
    error: groupError,
  } = useGetGroupQuery({ groupId: groupId ?? "" }, { skip: !groupId });

  const group = groupData?.group ?? null;
  const groupFilter = group?.filter;
  const inventory = useMemo(
    () => inventoryFromGroupResponse(groupData ?? {}),
    [groupData],
  );

  // --- Group VMs (table source) --------------------------------------------
  const byExpression = useMemo(
    () => filtersToByExpression(withDefaultReportInclusion(initialVMFilters)),
    [initialVMFilters],
  );

  const { data: vmsData, isFetching: vmsLoading } = useGetGroupVMsQuery(
    {
      groupId: groupId ?? "",
      groupFilter,
      byExpression,
      sort: vmsSortFields,
      page: vmsPage,
      pageSize: vmsPageSize,
    },
    { skip: activeTab !== REPORT_TAB.vms || !groupId || !groupFilter },
  );

  const vmsList = useMemo(
    () => normalizeVirtualMachines(vmsData?.virtualMachines ?? []),
    [vmsData],
  );
  const vmsTotalCount = vmsData?.total ?? 0;

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

  // --- Cache invalidation helpers ------------------------------------------
  // Both the header (getGroup) and the table (getGroupVMs) refetch from the
  // same invalidation, so their counts can never diverge.
  const invalidateGroupData = useCallback(() => {
    if (!groupId) {
      return;
    }
    dispatch(
      agentApiSlice.util.invalidateTags([
        { type: "Group", id: groupId },
        { type: "GroupVms", id: groupId },
        { type: "GroupInventory", id: groupId },
      ]),
    );
  }, [dispatch, groupId]);

  const refreshVMs = useCallback(() => {
    if (!groupId) {
      return;
    }
    dispatch(
      agentApiSlice.util.invalidateTags([{ type: "GroupVms", id: groupId }]),
    );
  }, [dispatch, groupId]);

  // Migration exclude/include change: refetch header (inventory) and table.
  const refreshGroupInventory = useCallback(async () => {
    invalidateGroupData();
  }, [invalidateGroupData]);

  const reloadGroupMembership = useCallback(async () => {
    setVmsPage(1);
    invalidateGroupData();
  }, [invalidateGroupData]);

  // Re-collection completion refreshes the group view.
  const { onCompleted } = useReportsContext();
  useEffect(
    () =>
      onCompleted(async () => {
        invalidateGroupData();
      }),
    [onCompleted, invalidateGroupData],
  );

  const [updateGroupName] = useUpdateGroupNameMutation();
  const [deleteGroup] = useDeleteGroupMutation();

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
    await updateGroupName({ groupId: group.id, name }).unwrap();
  };

  const handleDeleteGroup = async () => {
    if (!group) {
      return;
    }
    await deleteGroup({ groupId: group.id }).unwrap();
    invalidateAllGroupsCache(agentApi);
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

  if (!group) {
    const message = groupId
      ? getGroupErrorMessage(groupError)
      : "Group not found.";
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Alert variant="danger" title="Unable to load group">
          {message}
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
                      key={`group-assessment-${clusterView.viewVms.total ?? 0}-${clusterView.selectionId}`}
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

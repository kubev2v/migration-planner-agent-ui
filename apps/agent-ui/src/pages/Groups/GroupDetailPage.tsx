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
import { useCallback, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getAgentApiClient } from "../../api/agentApiClient";
import { AppEmptyState } from "../../common/components";
import { useAgentStatus } from "../../common/useAgentStatus";
import {
  useDeleteGroupMutation,
  useGetGroupQuery,
  useGetGroupVMsQuery,
  useUpdateGroupNameMutation,
} from "../../store/api/groupsEndpoints";
import {
  useGetApplicationsQuery,
  useGetVMFilterOptionsQuery,
} from "../../store/api/vmsEndpoints";
import { getSdkErrorMessage } from "../../store/baseQuery";
import {
  buildClusterViewModel,
  type ClusterOption,
} from "../VirtualMachinesOverview/clusterView";
import { ApplicationsView } from "../VirtualMachinesOverview/components/ApplicationsTab/ApplicationsView";
import { Dashboard } from "../VirtualMachinesOverview/components/Dashboard/Dashboard";
import { VirtualMachinesView } from "../VirtualMachinesOverview/components/VirtualMachinesTab/VirtualMachinesView";
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
import { reportPageFillStyles } from "../VirtualMachinesOverview/reportPageFill";
import {
  buildApplicationsTabUrl,
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  clearVmFilterParams,
  REPORT_TAB,
  reportTabToParam,
  resolveReportTab,
} from "../VirtualMachinesOverview/reportTabNavigation";
import { normalizeVirtualMachines } from "../VirtualMachinesOverview/virtualMachineParsing";
import { DeleteGroupModal } from "./components/modals/DeleteGroupModal";
import { EditGroupNameModal } from "./components/modals/EditGroupNameModal";

const EMPTY_FILTER_OPTIONS: VMTableFilterOptions = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  groups: [],
  applications: [],
};

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
  const { isRvtoolsMode } = useAgentStatus();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const agentApi = getAgentApiClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [vmsPage, setVmsPage] = useState(1);
  const [vmsPageSize, setVmsPageSize] = useState(20);
  const [vmsSortFields, setVmsSortFields] = useState<string[]>([]);

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  const activeTab: string | number = resolveReportTab(
    searchParams,
    hasActiveFilters(initialVMFilters),
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

  // Filter dropdowns are the global option set (shared with the overview page).
  const { data: filterOptionsData } = useGetVMFilterOptionsQuery(undefined, {
    skip: activeTab !== REPORT_TAB.vms,
  });
  const availableFilterOptions = filterOptionsData ?? EMPTY_FILTER_OPTIONS;

  // Applications, scoped to this group's membership filter.
  const {
    data: applicationsData,
    isFetching: applicationsLoading,
    error: applicationsQueryError,
  } = useGetApplicationsQuery(
    { scopeExpression: groupFilter },
    { skip: activeTab !== REPORT_TAB.applications || !groupFilter },
  );
  const applicationsList = applicationsData ?? [];
  const applicationsError = applicationsQueryError
    ? getSdkErrorMessage(applicationsQueryError, "Failed to load applications.")
    : null;

  const handleNavigateToVMFilters = useCallback(
    (filters: VMFilters) => {
      setVmsPage(1);
      const newParams = filtersToSearchParams(filters);
      newParams.set("tab", "vms");
      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams],
  );

  const [updateGroupName] = useUpdateGroupNameMutation();
  const [deleteGroup] = useDeleteGroupMutation();

  const handleTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
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
      const newParams = new URLSearchParams(searchParams);
      newParams.set("tab", reportTabToParam(activeTab));
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
    navigate("/report/groups");
  };

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
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
      <PageSection hasBodyWrapper={false} isFilled>
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
    <PageSection
      hasBodyWrapper={false}
      isFilled
      className={reportPageFillStyles.pageSection}
    >
      <Stack hasGutter className={reportPageFillStyles.stack}>
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

        <StackItem isFilled className={reportPageFillStyles.tabsHost}>
          <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
            <Tab
              eventKey={REPORT_TAB.overview}
              title={<TabTitleText>Assessment report</TabTitleText>}
            >
              <div className={reportPageFillStyles.tabBodyScroll}>
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
              <div className={reportPageFillStyles.tabBodyFill}>
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
                  groupContext={{ id: group.id, name: group.name }}
                  scopedFilterExpression={group.filter}
                  sortFields={vmsSortFields}
                />
              </div>
            </Tab>
            {!isRvtoolsMode && (
              <Tab
                eventKey={REPORT_TAB.applications}
                title={<TabTitleText>Applications</TabTitleText>}
              >
                <div className={reportPageFillStyles.tabBodyScroll}>
                  <ApplicationsView
                    applications={applicationsList}
                    loading={applicationsLoading}
                    error={applicationsError}
                    agentApi={agentApi}
                    selectedApplicationName={selectedApplicationName}
                    onClearSelectedApplication={handleClearSelectedApplication}
                    onNavigateToVm={handleNavigateToVm}
                    onViewInVmList={handleViewApplicationInVmList}
                  />
                </div>
              </Tab>
            )}
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

import { css } from "@emotion/css";
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Content,
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
  TabContent,
  TabContentBody,
  Tabs,
  TabTitleText,
} from "@patternfly/react-core";
import { InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getAgentApiClient } from "../../api/agentApiClient";
import { AppEmptyState } from "../../common/components";
import {
  useGetGroupQuery,
  useGetGroupVMsQuery,
} from "../../store/api/groupsEndpoints";
import { useGetVMFilterOptionsQuery } from "../../store/api/vmsEndpoints";
import { getSdkErrorMessage } from "../../store/baseQuery";
import {
  buildClusterViewModel,
  type ClusterOption,
  getFleetHeaderCounts,
} from "../VirtualMachinesOverview/clusterView";
import { Dashboard } from "../VirtualMachinesOverview/components/Dashboard/Dashboard";
import { VirtualMachinesView } from "../VirtualMachinesOverview/components/VirtualMachinesTab/VirtualMachinesView";
import {
  buildScopedVmByExpression,
  clusterSelectionExpression,
  combineFilterExpressions,
  filtersToSearchParams,
  hasActiveFilters,
  searchParamsToFilters,
  type VMFilters,
} from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmFilters";
import {
  vmsTabContentBodyStyle,
  vmsTabContentStyle,
  vmsTabsStackItemStyle,
} from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmTableShared";
import type { VMTableFilterOptions } from "../VirtualMachinesOverview/components/VirtualMachinesTab/vmTableTypes";
import { Header } from "../VirtualMachinesOverview/Header";
import {
  getInventoryAggregateView,
  inventoryFromGroupResponse,
} from "../VirtualMachinesOverview/inventoryParsing";
import {
  buildOverviewTabUrl,
  buildVmsTabUrl,
  clearVmFilterParams,
  getClusterParam,
  REPORT_TAB,
  resolveReportTab,
  setClusterParam,
  setTabParam,
} from "../VirtualMachinesOverview/reportTabNavigation";
import { normalizeVirtualMachines } from "../VirtualMachinesOverview/virtualMachineParsing";

const EMPTY_FILTER_OPTIONS: VMTableFilterOptions = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  vsphereTags: [],
};

const groupVmTableContainerStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  return <GroupReportPage key={groupId ?? ""} groupId={groupId} />;
};

const GroupReportPage: React.FC<{ groupId?: string }> = ({ groupId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClusterId = getClusterParam(searchParams);
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);
  const [vmsPage, setVmsPage] = useState(1);
  const [vmsPageSize, setVmsPageSize] = useState(20);
  const [vmsSortFields, setVmsSortFields] = useState<string[]>([]);

  const overviewTabRef = useRef<HTMLElement>(null);
  const vmsTabRef = useRef<HTMLElement>(null);

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );
  const activeTab: string | number = resolveReportTab(
    searchParams,
    hasActiveFilters(initialVMFilters),
  );

  const {
    currentData: groupData,
    isLoading: groupLoading,
    error: groupError,
  } = useGetGroupQuery({ groupId: groupId ?? "" }, { skip: !groupId });
  const group = groupData?.group;
  const groupFilter = group?.filter;

  const inventory = useMemo(
    () => inventoryFromGroupResponse(groupData ?? {}),
    [groupData],
  );
  const aggregateView = useMemo(
    () => getInventoryAggregateView(inventory),
    [inventory],
  );
  const clusterView = useMemo(
    () =>
      buildClusterViewModel({
        infra: aggregateView.infra,
        vms: aggregateView.vms,
        clusters: aggregateView.clusters,
        selectedClusterId,
      }),
    [aggregateView, selectedClusterId],
  );
  const { totalVMs, totalClusters } = getFleetHeaderCounts(aggregateView);
  const clusterScopeExpression = clusterSelectionExpression(
    clusterView.selectionId,
  );
  const byExpression = useMemo(
    () => buildScopedVmByExpression(initialVMFilters, clusterView.selectionId),
    [initialVMFilters, clusterView.selectionId],
  );

  const { data: filterOptionsData } = useGetVMFilterOptionsQuery(undefined, {
    skip: activeTab !== REPORT_TAB.vms,
  });
  const availableFilterOptions = filterOptionsData ?? EMPTY_FILTER_OPTIONS;

  const {
    currentData: vmsData,
    isFetching: vmsLoading,
    error: vmsError,
  } = useGetGroupVMsQuery(
    {
      groupId: groupId ?? "",
      groupFilter,
      byExpression,
      sort: vmsSortFields,
      page: vmsPage,
      pageSize: vmsPageSize,
    },
    {
      skip: activeTab !== REPORT_TAB.vms || !groupId || !groupFilter,
    },
  );

  const vms = useMemo(
    () => normalizeVirtualMachines(vmsData?.virtualMachines ?? []),
    [vmsData?.virtualMachines],
  );

  const handleNavigateToVMFilters = useCallback(
    (filters: VMFilters) => {
      setVmsPage(1);
      const newParams = filtersToSearchParams(filters);
      setTabParam(newParams, REPORT_TAB.vms);
      setClusterParam(newParams, getClusterParam(searchParams));
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    const newParams =
      tabIndex === REPORT_TAB.vms
        ? buildVmsTabUrl(searchParams)
        : buildOverviewTabUrl(searchParams);
    if (tabIndex === REPORT_TAB.vms) {
      setVmsPage(1);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClusterSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    clusterId: string | number | undefined,
  ): void => {
    if (typeof clusterId === "string") {
      setVmsPage(1);
      const newParams = new URLSearchParams(searchParams);
      setClusterParam(newParams, clusterId);
      setTabParam(newParams, activeTab);
      newParams.delete("vmId");
      clearVmFilterParams(newParams);
      setSearchParams(newParams, { replace: true });
    }
    setIsClusterSelectOpen(false);
  };

  const handleConcernClick = useCallback(
    (concernLabel: string) => {
      handleNavigateToVMFilters({ concernLabels: [concernLabel] });
    },
    [handleNavigateToVMFilters],
  );

  const clusterSelectDisabled = clusterView.clusterOptions.length <= 1;
  const agentApi = getAgentApiClient();

  if (groupLoading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <AppEmptyState
          titleText="Loading group report"
          icon={Spinner}
          bullseyeStyle={{ minHeight: "240px" }}
        />
      </PageSection>
    );
  }

  if (!group) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <Stack hasGutter>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to="/report/groups">Groups</Link>
            </BreadcrumbItem>
          </Breadcrumb>
          <Alert variant="danger" title="Unable to load group report">
            {getSdkErrorMessage(groupError, "Group not found.")}
          </Alert>
        </Stack>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} isFilled>
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
          <Content component="h1">{group.name}</Content>
        </StackItem>

        <StackItem>
          <Header totalVMs={totalVMs} totalClusters={totalClusters} />
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

        <StackItem isFilled className={vmsTabsStackItemStyle}>
          <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
            <Tab
              eventKey={REPORT_TAB.overview}
              title={<TabTitleText>Assessment report</TabTitleText>}
              tabContentId="group-tab-overview"
              tabContentRef={overviewTabRef}
            />
            <Tab
              eventKey={REPORT_TAB.vms}
              title={<TabTitleText>Virtual machines</TabTitleText>}
              tabContentId="group-tab-vms"
              tabContentRef={vmsTabRef}
            />
          </Tabs>

          <TabContent
            eventKey={REPORT_TAB.overview}
            id="group-tab-overview"
            ref={overviewTabRef}
            hidden={activeTab !== REPORT_TAB.overview}
          >
            <TabContentBody hasPadding>
              <Content component="h2">Report for {group.name} group</Content>
              <Content component="p">
                This report is based on the virtual machines in this group,
                except those excluded from reports.
              </Content>
              {clusterView.viewInfra && clusterView.viewVms ? (
                <Dashboard
                  key={`group-report-${clusterView.viewVms.total ?? 0}-${clusterView.selectionId}`}
                  infra={clusterView.viewInfra}
                  cpuCores={clusterView.cpuCores}
                  ramGB={clusterView.ramGB}
                  vms={clusterView.viewVms}
                  clusters={clusterView.viewClusters}
                  vcenterVersion={inventory?.vcenter_version}
                  vcenterId={inventory?.vcenter_id}
                  isAggregateView={clusterView.isAggregateView}
                  clusterFound={clusterView.clusterFound}
                  onConcernClick={handleConcernClick}
                  onNavigateToVMFilters={handleNavigateToVMFilters}
                />
              ) : (
                <AppEmptyState
                  titleText="No report data is available for this group yet"
                  body="Report data will appear once the virtual machines in this group have been inventoried."
                  icon={InboxIcon}
                  bullseyeStyle={{ minHeight: "240px" }}
                />
              )}
            </TabContentBody>
          </TabContent>

          <TabContent
            eventKey={REPORT_TAB.vms}
            id="group-tab-vms"
            ref={vmsTabRef}
            hidden={activeTab !== REPORT_TAB.vms}
            className={vmsTabContentStyle}
          >
            <TabContentBody hasPadding className={vmsTabContentBodyStyle}>
              {vmsError && (
                <Alert
                  variant="danger"
                  title={getSdkErrorMessage(
                    vmsError,
                    "Failed to load group VMs.",
                  )}
                  isInline
                />
              )}
              <div className={groupVmTableContainerStyle}>
                <VirtualMachinesView
                  vms={vms}
                  loading={vmsLoading}
                  totalVMs={vmsData?.total ?? 0}
                  currentPage={vmsPage}
                  pageSize={vmsPageSize}
                  initialFilters={initialVMFilters}
                  availableFilterOptions={availableFilterOptions}
                  onFiltersChange={() => setVmsPage(1)}
                  onPageChange={(page, pageSize) => {
                    setVmsPage(page);
                    setVmsPageSize(pageSize);
                  }}
                  onSortChange={setVmsSortFields}
                  agentApi={agentApi}
                  groupContext={{ id: group.id, name: group.name }}
                  scopedFilterExpression={combineFilterExpressions(
                    groupFilter,
                    clusterScopeExpression,
                  )}
                  sortFields={vmsSortFields}
                />
              </div>
            </TabContentBody>
          </TabContent>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

GroupDetailPage.displayName = "GroupDetailPage";

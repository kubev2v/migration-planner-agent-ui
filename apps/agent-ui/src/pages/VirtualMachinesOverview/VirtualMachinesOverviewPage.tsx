import {
  Alert,
  Content,
  MenuToggle,
  type MenuToggleElement,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from "@patternfly/react-core";
import { InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAgentApiClient } from "../../api/agentApiClient";
import { AppEmptyState } from "../../common/components/index";
import { DiscoveryStatus } from "../../common/DiscoveryStatus";
import { useListCollectionsQuery } from "../../store/api/comparisonEndpoints";
import {
  useGetApplicationsQuery,
  useGetClusterUtilizationQuery,
  useGetInventoryQuery,
  useGetVMFilterOptionsQuery,
  useGetVMsQuery,
} from "../../store/api/vmsEndpoints";
import { getSdkErrorMessage } from "../../store/baseQuery";
import { buildClusterViewModel, type ClusterOption } from "./clusterView";
import { ApplicationsView } from "./components/ApplicationsTab/ApplicationsView";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { ExportCsvModal } from "./components/Export/ExportCsvModal";
import { useExportInventory } from "./components/Export/useExportInventory";
import { VirtualMachinesView } from "./components/VirtualMachinesTab/VirtualMachinesView";
import { VMUtilizationMetrics } from "./components/VirtualMachinesTab/VMUtilizationMetrics";
import {
  filtersToByExpression,
  filtersToSearchParams,
  hasActiveFilters,
  searchParamsToFilters,
  type VMFilters,
  withDefaultReportInclusion,
} from "./components/VirtualMachinesTab/vmFilters";
import type { VMTableFilterOptions } from "./components/VirtualMachinesTab/vmTableTypes";
import { Header } from "./Header";
import { getInventoryAggregateView } from "./inventoryParsing";
import { ReportPageHeader } from "./ReportPageHeader";
import {
  buildApplicationsTabUrl,
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  clearVmFilterParams,
  REPORT_TAB,
  resolveReportTab,
} from "./reportTabNavigation";
import { normalizeVirtualMachines } from "./virtualMachineParsing";

const EMPTY_FILTER_OPTIONS: VMTableFilterOptions = {
  clusters: [],
  datacenters: [],
  concernLabels: [],
  concernCategories: [],
  vmLabels: [],
  groups: [],
  applications: [],
};

export const ReportContainer: React.FC = () => {
  const agentApi = getAgentApiClient();
  const { data: collections } = useListCollectionsQuery();
  const hasCollectionData = (collections?.length ?? 0) > 0;
  const newestCollectionId = collections?.[0]?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);

  // VM pagination state (client-only; the query keys on these values)
  const [vmsPage, setVmsPage] = useState(1);
  const [vmsPageSize, setVmsPageSize] = useState(20);
  const [vmsSortFields, setVmsSortFields] = useState<string[]>([]);

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  const handleNavigateToVMFilters = useCallback(
    (filters: VMFilters) => {
      setActiveTab(1);
      setVmsPage(1);
      const newParams = filtersToSearchParams(filters);
      newParams.set("tab", "vms");
      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams],
  );

  const handleClearSelectedApplication = useCallback(() => {
    setSearchParams(buildApplicationsTabUrl(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);

  const handleViewApplicationInVmList = useCallback(
    (applicationName: string) => {
      handleNavigateToVMFilters({ applications: [applicationName] });
    },
    [handleNavigateToVMFilters],
  );

  const selectedApplicationName = searchParams.get("application");

  // Determine initial tab based on URL params (only on mount)
  const [activeTab, setActiveTab] = useState<string | number>(() =>
    resolveReportTab(searchParams, hasActiveFilters(initialVMFilters)),
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

  // --- Server data (RTK Query) ---------------------------------------------
  // The assessment inventory drives the dashboard, the header counts and the
  // gating of the whole page (loading / error / no-inventory states).
  const {
    data: inventory,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = useGetInventoryQuery();

  const byExpression = useMemo(
    () => filtersToByExpression(withDefaultReportInclusion(initialVMFilters)),
    [initialVMFilters],
  );

  const { data: vmsData, isFetching: vmsFetching } = useGetVMsQuery(
    {
      byExpression,
      sort: vmsSortFields,
      page: vmsPage,
      pageSize: vmsPageSize,
    },
    { skip: activeTab !== REPORT_TAB.vms },
  );
  const vmsList = useMemo(
    () => normalizeVirtualMachines(vmsData?.virtualMachines),
    [vmsData],
  );
  const vmsTotalCount = vmsData?.total ?? 0;

  const { data: filterOptionsData } = useGetVMFilterOptionsQuery(undefined, {
    skip: activeTab !== REPORT_TAB.vms || !inventory,
  });
  const availableFilterOptions = filterOptionsData ?? EMPTY_FILTER_OPTIONS;

  const {
    data: applicationsData,
    isFetching: applicationsFetching,
    error: applicationsQueryError,
  } = useGetApplicationsQuery(
    {},
    { skip: activeTab !== REPORT_TAB.applications },
  );
  const applicationsList = applicationsData ?? [];
  const applicationsError = applicationsQueryError
    ? getSdkErrorMessage(applicationsQueryError, "Failed to load applications.")
    : null;

  // Cluster usage statistics — only fetched when a specific cluster is
  // selected. The query keys on clusterId, so switching clusters refetches and
  // switching back to "all" (skip) hides the metrics.
  const { data: utilizationMetrics } = useGetClusterUtilizationQuery(
    selectedClusterId,
    { skip: selectedClusterId === "all" },
  );

  // A completed report invalidates the inventory/VM caches through the
  // collection-completion listener (see
  // `store/listeners/vmsInvalidationListeners.ts`), so the queries above refetch
  // on their own. The page only needs to reset its client-side pagination back
  // to the first page when a newer collection replaces the current one.
  const [pagedCollectionId, setPagedCollectionId] = useState<
    string | undefined
  >(newestCollectionId);
  useEffect(() => {
    if (newestCollectionId !== pagedCollectionId) {
      setPagedCollectionId(newestCollectionId);
      setVmsPage(1);
    }
  }, [newestCollectionId, pagedCollectionId]);

  const {
    isExportModalOpen,
    showExport,
    exportError,
    isExporting,
    openExportModal,
    closeExportModal,
    confirmExport,
  } = useExportInventory(agentApi, {
    hasCollectionData,
    hasInventory: Boolean(inventory),
  });

  if (inventoryLoading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Stack hasGutter>
          <StackItem>
            <ReportPageHeader />
            <DiscoveryStatus />
          </StackItem>
          <StackItem>
            <Header totalVMs={0} totalClusters={0} />
          </StackItem>
          <StackItem>
            <Content component="p">Loading inventory data...</Content>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }

  if (inventoryError) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Stack hasGutter>
          <StackItem>
            <ReportPageHeader />
            <DiscoveryStatus />
          </StackItem>
          <StackItem>
            <Header totalVMs={0} totalClusters={0} />
          </StackItem>
          <StackItem>
            <Alert variant="danger" title="Error loading inventory">
              {getSdkErrorMessage(inventoryError, "Failed to load data")}
            </Alert>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }

  if (!inventory) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Stack hasGutter>
          <StackItem>
            <ReportPageHeader />
            <DiscoveryStatus />
          </StackItem>
          <StackItem>
            <Header totalVMs={0} totalClusters={0} />
          </StackItem>
          <StackItem>
            <Alert variant="info" title="No inventory available">
              The inventory has not been collected yet. Please start the
              collector to gather information about your virtual machines.
            </Alert>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }

  const aggregateView = getInventoryAggregateView(inventory);
  const totalVMs = aggregateView.vms?.total ?? 0;
  const totalClusters = Object.keys(aggregateView.clusters).length;

  const clusterView = buildClusterViewModel({
    infra: aggregateView.infra,
    vms: aggregateView.vms,
    clusters: aggregateView.clusters,
    selectedClusterId,
  });

  const clusterSelectDisabled = clusterView.clusterOptions.length <= 1;

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

  const handleFiltersChange = () => {
    // Filters are already in URL params via initialVMFilters
    // Reset to page 1 when filters change
    setVmsPage(1);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setVmsPage(page);
    setVmsPageSize(pageSize);
  };

  const handleSortChange = (sortFields: string[]) => {
    setVmsSortFields(sortFields);
  };

  const handleConcernClick = (concernLabel: string) => {
    setActiveTab(REPORT_TAB.vms);
    const newParams = filtersToSearchParams({
      concernLabels: [concernLabel],
    });
    newParams.set("tab", "vms");
    setSearchParams(newParams, { replace: true });
    setVmsPage(1);
  };

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <Stack hasGutter>
        <StackItem>
          <ReportPageHeader
            showExport={showExport}
            onExportClick={openExportModal}
          />
          <DiscoveryStatus />
        </StackItem>

        {/* Cluster Selector */}
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

        {utilizationMetrics && (
          <StackItem>
            <Content component="p">
              Total usage statistics{" "}
              <VMUtilizationMetrics
                cpu={utilizationMetrics.cpu_avg}
                disk={utilizationMetrics.disk}
                ram={utilizationMetrics.mem_avg}
              />
            </Content>
          </StackItem>
        )}

        {/* Tabs */}
        <StackItem>
          <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
            <Tab
              eventKey={REPORT_TAB.overview}
              title={<TabTitleText>Assessment report</TabTitleText>}
            >
              <div style={{ marginTop: "24px" }}>
                {clusterView.viewInfra && clusterView.viewVms ? (
                  <Dashboard
                    key={`assessment-${clusterView.viewVms.total ?? 0}-${clusterView.selectionId}`}
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
                ) : (
                  <AppEmptyState
                    titleText={
                      clusterView.isAggregateView
                        ? "This assessment does not have report data yet"
                        : "No data is available for the selected cluster"
                    }
                    body={
                      clusterView.isAggregateView
                        ? "Report data will appear here once inventory collection is complete."
                        : "Select a different cluster or check that inventory data has been collected."
                    }
                    icon={InboxIcon}
                    bullseyeStyle={{ minHeight: "240px" }}
                  />
                )}
              </div>
            </Tab>
            <Tab
              eventKey={REPORT_TAB.vms}
              title={<TabTitleText>Virtual Machines</TabTitleText>}
            >
              <div style={{ marginTop: "24px" }}>
                <VirtualMachinesView
                  vms={vmsList}
                  loading={vmsFetching}
                  initialFilters={initialVMFilters}
                  totalVMs={vmsTotalCount}
                  currentPage={vmsPage}
                  pageSize={vmsPageSize}
                  onFiltersChange={handleFiltersChange}
                  onPageChange={handlePageChange}
                  onSortChange={handleSortChange}
                  sortFields={vmsSortFields}
                  availableFilterOptions={availableFilterOptions}
                  agentApi={agentApi}
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
                  loading={applicationsFetching}
                  error={applicationsError}
                  agentApi={agentApi}
                  selectedApplicationName={selectedApplicationName}
                  onClearSelectedApplication={handleClearSelectedApplication}
                  onNavigateToVm={handleNavigateToVm}
                  onViewInVmList={handleViewApplicationInVmList}
                />
              </div>
            </Tab>
          </Tabs>
        </StackItem>
      </Stack>

      <ExportCsvModal
        isOpen={isExportModalOpen}
        error={exportError}
        isExporting={isExporting}
        onClose={closeExportModal}
        onExport={confirmExport}
      />
    </PageSection>
  );
};

ReportContainer.displayName = "ReportContainer";

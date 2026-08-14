import { useInjection } from "@migration-planner-ui/ioc";
import type {
  RightsizingClusterUtilization,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DefaultApiInterface } from "../../common/agentApi";
import { getLatestCollectionId } from "../../common/collectionApi";
import { AppEmptyState } from "../../common/components/index";
import { DiscoveryStatus } from "../../common/DiscoveryStatus";
import { useRunNewReportContext } from "../../common/report/RunNewReportContext";
import { Symbols } from "../../main/Symbols";
import {
  buildApplicationsTabUrl,
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  clearVmFilterParams,
  REPORT_TAB,
  resolveReportTab,
} from "../reportTabNavigation";
import { getAgentApiBasePath } from "./agentApiConfig";
import { buildClusterViewModel, type ClusterOption } from "./clusterView";
import { ApplicationsView } from "./components/ApplicationsTab/ApplicationsView";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { ExportCsvModal } from "./components/Export/ExportCsvModal";
import { useExportInventory } from "./components/Export/useExportInventory";
import { VirtualMachinesView } from "./components/VirtualMachinesTab/VirtualMachinesView";
import { VMUtilizationMetrics } from "./components/VirtualMachinesTab/VMUtilizationMetrics";
import { createRefreshVmTableFilterOptions } from "./components/VirtualMachinesTab/vmFilterOptions";
import {
  filtersToByExpression,
  filtersToSearchParams,
  hasActiveFilters,
  searchParamsToFilters,
  type VMFilters,
  withDefaultReportInclusion,
} from "./components/VirtualMachinesTab/vmFilters";
import { Header } from "./Header";
import {
  fetchInventoryFromApi,
  getInventoryAggregateView,
  type InventoryPayload,
} from "./inventoryParsing";
import { ReportPageHeader } from "./ReportPageHeader";
import { useApplicationsData } from "./useApplicationsData";
import { useMigrationInventoryRefresh } from "./useMigrationInventoryRefresh";
import { normalizeVirtualMachines } from "./virtualMachineParsing";

export const ReportContainer: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const { hasCollectionData } = useRunNewReportContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inventory, setInventory] = useState<InventoryPayload | null>(null);
  const [vmsList, setVmsList] = useState<VirtualMachine[]>([]);
  const [vmsLoading, setVmsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);
  const [utilizationMetrics, setUtilizationMetrics] =
    useState<RightsizingClusterUtilization | null>(null);
  const [reportDataRefreshKey, setReportDataRefreshKey] = useState(0);

  // Separate request IDs for the initial/effect-driven fetch vs. polling refresh
  // so that concurrent calls from different sources don't discard each other's
  // responses.
  const vmsRequestIdRef = useRef(0);
  const vmsRefreshIdRef = useRef(0);

  // VM pagination state
  const [vmsTotalCount, setVmsTotalCount] = useState(0);
  const [vmsPage, setVmsPage] = useState(1);
  const [vmsPageSize, setVmsPageSize] = useState(20);
  const [vmsSortFields, setVmsSortFields] = useState<string[]>([]);

  // Store all available filter options (fetched once for filter UI)
  const [availableFilterOptions, setAvailableFilterOptions] = useState<{
    clusters: string[];
    datacenters: string[];
    concernLabels: string[];
    concernCategories: string[];
    vmLabels: string[];
    groups: string[];
    applications: string[];
  }>({
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

  const {
    applications: applicationsList,
    loading: applicationsLoading,
    error: applicationsError,
    refreshApplications,
  } = useApplicationsData(agentApi, activeTab === REPORT_TAB.applications);

  useEffect(() => {
    const nextTab = resolveReportTab(
      searchParams,
      hasActiveFilters(searchParamsToFilters(searchParams)),
    );
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  const fetchInventory =
    useCallback(async (): Promise<InventoryPayload | null> => {
      const basePath = getAgentApiBasePath(agentApi);
      return fetchInventoryFromApi(basePath);
    }, [agentApi]);

  const {
    revision: inventoryRevision,
    refreshInventory,
    reloadInventory,
  } = useMigrationInventoryRefresh({
    agentApi,
    setInventory,
    setVmsList,
  });

  // Fetch inventory only (agent status comes from context)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const nextInventory = await fetchInventory();
        setInventory(nextInventory);
      } catch (err) {
        console.error("Error fetching inventory:", err);

        if (err instanceof ResponseError && err.response?.status === 404) {
          setInventory(null);
          setError(null);
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to load data";
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchInventory]);

  // Fetch cluster utilization metrics
  useEffect(() => {
    // Only fetch metrics when a specific cluster is selected
    if (selectedClusterId === "all") {
      setUtilizationMetrics(null);
      return;
    }

    let cancelled = false;

    const fetchUtilizationMetrics = async () => {
      try {
        const collectionId = await getLatestCollectionId(agentApi);
        if (!collectionId) {
          if (!cancelled) {
            setUtilizationMetrics(null);
          }
          return;
        }

        const response = await agentApi.getClusterUtilization({
          id: collectionId,
          clusterId: selectedClusterId,
        });

        // Only update state if the effect hasn't been cleaned up
        if (!cancelled) {
          setUtilizationMetrics(response.cluster);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to fetch utilization metrics:", err);
          setUtilizationMetrics(null);
        }
      }
    };

    void fetchUtilizationMetrics();

    return () => {
      cancelled = true;
    };
  }, [agentApi, selectedClusterId]);

  // Fetch available filter options once when VMs tab is first accessed
  useEffect(() => {
    if (activeTab !== REPORT_TAB.vms) return;
    if (filterOptionsFetched) return;
    if (!inventory) return;

    const fetchFilterOptions = async () => {
      try {
        await refreshFilterOptions();
        setFilterOptionsFetched(true);
      } catch (err) {
        console.error("Error fetching filter options:", err);
        if (inventory) {
          setFilterOptionsFetched(true);
        }
      }
    };

    fetchFilterOptions();
  }, [activeTab, filterOptionsFetched, inventory, refreshFilterOptions]);

  // Fetch VMs when Virtual Machines tab is active or filters change
  useEffect(() => {
    if (activeTab !== REPORT_TAB.vms) return;

    const fetchVMs = async () => {
      vmsRequestIdRef.current += 1;
      const currentRequestId = vmsRequestIdRef.current;

      try {
        setVmsLoading(true);

        const byExpression = filtersToByExpression(
          withDefaultReportInclusion(initialVMFilters),
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
        console.error("Error fetching VMs:", err);
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
    initialVMFilters,
    vmsPage,
    vmsPageSize,
    vmsSortFields,
  ]);

  const refreshVMs = useCallback(async () => {
    const reqId = ++vmsRefreshIdRef.current;
    try {
      const byExpression = filtersToByExpression(
        withDefaultReportInclusion(initialVMFilters),
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
      console.error("Error refreshing VMs:", err);
    }
  }, [agentApi, initialVMFilters, vmsSortFields, vmsPage, vmsPageSize]);

  const { onCompleted } = useRunNewReportContext();

  const handleReportRefreshCompleted = useCallback(async () => {
    setVmsPage(1);
    setFilterOptionsFetched(false);

    await Promise.all([
      reloadInventory().catch((err) => {
        console.error("Error refreshing Inventory after new report:", err);
      }),
      refreshVMs().catch((err) => {
        console.error("Error refreshing VMs after new report:", err);
      }),
      refreshApplications().catch((err) => {
        console.error("Error refreshing applications after new report:", err);
      }),
      Promise.resolve(refreshFilterOptions({ force: true })).catch(
        () => undefined,
      ),
    ]);

    setReportDataRefreshKey((current) => current + 1);
  }, [reloadInventory, refreshVMs, refreshApplications, refreshFilterOptions]);

  useEffect(() => {
    return onCompleted(handleReportRefreshCompleted);
  }, [onCompleted, handleReportRefreshCompleted]);

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

  if (loading) {
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

  if (error) {
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
              {error}
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
      void reloadInventory();
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
                    key={`assessment-${inventoryRevision}-${reportDataRefreshKey}-${clusterView.viewVms.total ?? 0}-${clusterView.selectionId}`}
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
                  loading={vmsLoading}
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
                  onRefreshVMs={refreshVMs}
                  onRefreshInventory={refreshInventory}
                  onRefreshFilterOptions={refreshFilterOptions}
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

import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  Inventory,
  RightsizingClusterUtilization,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import {
  instanceOfInventory,
  instanceOfUpdateInventory,
  ResponseError,
} from "@openshift-migration-advisor/agent-sdk";
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
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAgentStatus } from "../../common/AgentStatusContext";
import {
  DataSharingAlert,
  DataSharingModal,
} from "../../common/components/index";
import { Symbols } from "../../main/Symbols";
import { buildClusterViewModel, type ClusterOption } from "./clusterView";
import {
  ApplicationsView,
  Dashboard,
  VirtualMachinesView,
} from "./components/index";
import { VMUtilizationMetrics } from "./components/VMUtilizationMetrics";
import {
  filtersToByExpression,
  hasActiveFilters,
  searchParamsToFilters,
} from "./components/vmFilters";
import { Header } from "./Header";
import { inventoryFromGetInventoryResponse } from "./inventoryParsing";
import {
  buildApplicationsTabUrl,
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  clearVmFilterParams,
  REPORT_TAB,
  resolveReportTab,
} from "./reportTabNavigation";
import { useApplicationsData } from "./useApplicationsData";

export const ReportContainer: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const { agentStatus, refetch: refetchAgentStatus } = useAgentStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [vmsList, setVmsList] = useState<VirtualMachine[]>([]);
  const [vmsLoading, setVmsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string>("all");
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [utilizationMetrics, setUtilizationMetrics] =
    useState<RightsizingClusterUtilization | null>(null);

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
  const [showExcludedVMs, setShowExcludedVMs] = useState(true);

  // Store all available filter options (fetched once for filter UI)
  const [availableFilterOptions, setAvailableFilterOptions] = useState<{
    clusters: string[];
    datacenters: string[];
    concernLabels: string[];
    concernCategories: string[];
    vmLabels: string[];
  }>({
    clusters: [],
    datacenters: [],
    concernLabels: [],
    concernCategories: [],
    vmLabels: [],
  });
  const [filterOptionsFetched, setFilterOptionsFetched] = useState(false);

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  // Determine initial tab based on URL params (only on mount)
  const [activeTab, setActiveTab] = useState<string | number>(() =>
    resolveReportTab(searchParams, hasActiveFilters(initialVMFilters)),
  );

  const {
    applications: applicationsList,
    loading: applicationsLoading,
    error: applicationsError,
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

  // Fetch inventory only (agent status comes from context)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await agentApi.getInventory({});
        setInventory(inventoryFromGetInventoryResponse(response));
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
  }, [agentApi]);

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
        const response = await agentApi.getClusterUtilization({
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

    fetchUtilizationMetrics();

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
        const [response, labelsResponse] = await Promise.all([
          agentApi.getVMsFilterOptions(),
          agentApi.getVMLabels().catch(() => ({ labels: [] as string[] })),
        ]);
        setAvailableFilterOptions({
          clusters: response.clusters || [],
          datacenters: response.datacenters || [],
          concernLabels: response.concernLabels || [],
          concernCategories: response.concernCategories || [],
          vmLabels: labelsResponse.labels || [],
        });
        setFilterOptionsFetched(true);
      } catch (err) {
        console.error("Error fetching filter options:", err);
        if (inventory) {
          setFilterOptionsFetched(true);
        }
      }
    };

    fetchFilterOptions();
  }, [activeTab, agentApi, filterOptionsFetched, inventory]);

  // Fetch VMs when Virtual Machines tab is active or filters change
  useEffect(() => {
    if (activeTab !== REPORT_TAB.vms) return;

    const fetchVMs = async () => {
      vmsRequestIdRef.current += 1;
      const currentRequestId = vmsRequestIdRef.current;

      try {
        setVmsLoading(true);

        const effectiveFilters = { ...initialVMFilters, showExcludedVMs };
        const byExpression = filtersToByExpression(effectiveFilters);

        const response = await agentApi.getVMs({
          byExpression,
          sort: vmsSortFields.length > 0 ? vmsSortFields : undefined,
          page: vmsPage,
          pageSize: vmsPageSize,
        });

        if (currentRequestId === vmsRequestIdRef.current) {
          setVmsList(response.vms || []);
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
    showExcludedVMs,
    vmsPage,
    vmsPageSize,
    vmsSortFields,
  ]);

  const refreshVMs = useCallback(async () => {
    const reqId = ++vmsRefreshIdRef.current;
    try {
      const effectiveFilters = { ...initialVMFilters, showExcludedVMs };
      const byExpression = filtersToByExpression(effectiveFilters);
      const [response, labelsResponse] = await Promise.all([
        agentApi.getVMs({
          byExpression,
          sort: vmsSortFields.length > 0 ? vmsSortFields : undefined,
          page: vmsPage,
          pageSize: vmsPageSize,
        }),
        agentApi.getVMLabels().catch(() => null),
      ]);
      if (vmsRefreshIdRef.current === reqId) {
        setVmsList(response.vms || []);
        setVmsTotalCount(response.total || 0);
        setAvailableFilterOptions((prev) => ({
          ...prev,
          vmLabels: labelsResponse?.labels ?? prev.vmLabels,
        }));
      }
    } catch (err) {
      console.error("Error refreshing VMs:", err);
    }
  }, [
    agentApi,
    initialVMFilters,
    showExcludedVMs,
    vmsSortFields,
    vmsPage,
    vmsPageSize,
  ]);

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Stack hasGutter>
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

  // Extract data from inventory
  const infra = inventory.vcenter?.infra;
  const vms = inventory.vcenter?.vms;
  const clusters = inventory.clusters || {};

  const totalVMs = vms?.total || 0;
  const totalClusters = Object.keys(clusters).length;

  // Build cluster view model
  const clusterView = buildClusterViewModel({
    infra,
    vms,
    clusters,
    selectedClusterId,
  });

  const clusterSelectDisabled = clusterView.clusterOptions.length <= 1;
  const isDataShared = agentStatus?.mode === "connected";

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleShareConfirm = async () => {
    setIsShareLoading(true);
    setShareError(null); // Clear any previous errors
    try {
      await agentApi.setAgentMode({ agentModeRequest: { mode: "connected" } });
      // Refresh agent status from context
      await refetchAgentStatus();
      // Clear error and close modal on success
      setShareError(null);
      setIsShareModalOpen(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to enable data sharing. Please try again.";
      setShareError(errorMessage);
      console.error("Error changing agent mode:", err);
      // Keep modal open on error so user can retry
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleShareCancel = () => {
    setShareError(null); // Clear error when cancelling
    setIsShareModalOpen(false);
  };

  const handleDownloadInventory = async () => {
    try {
      const response = await agentApi.getInventory({ withAgentId: true });

      let downloadData: unknown = response;
      if (instanceOfInventory(response)) {
        downloadData = { agent_id: "", inventory: response };
      } else if (!instanceOfUpdateInventory(response)) {
        throw new Error("Unexpected inventory response format");
      }

      const jsonString = JSON.stringify(downloadData, null, 2);

      // Create a Blob from the JSON string
      const blob = new Blob([jsonString], { type: "application/json" });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-${new Date().toISOString().split("T")[0]}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading inventory:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to download inventory. Please try again.";
      // You could show this error to the user via a toast or alert if needed
      alert(errorMessage);
    }
  };

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
    const newParams = buildVmsTabUrl(searchParams);
    newParams.set("concernLabels", concernLabel);
    setSearchParams(newParams, { replace: true });
    setVmsPage(1);
  };

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <Stack hasGutter>
        <StackItem>
          <Header totalVMs={totalVMs} totalClusters={totalClusters} />
        </StackItem>

        {!isDataShared && (
          <StackItem>
            <DataSharingAlert
              onShare={handleShareClick}
              onDownloadInventory={handleDownloadInventory}
            />
          </StackItem>
        )}

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
                    infra={clusterView.viewInfra}
                    cpuCores={clusterView.cpuCores}
                    ramGB={clusterView.ramGB}
                    vms={clusterView.viewVms}
                    clusters={clusterView.viewClusters}
                    isAggregateView={clusterView.isAggregateView}
                    clusterFound={clusterView.clusterFound}
                    onConcernClick={handleConcernClick}
                  />
                ) : (
                  <Content component="p">
                    {clusterView.isAggregateView
                      ? "This assessment does not have report data yet."
                      : "No data is available for the selected cluster."}
                  </Content>
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
                  showExcludedVMs={showExcludedVMs}
                  onShowExcludedVMsChange={(show) => {
                    setShowExcludedVMs(show);
                    setVmsPage(1);
                  }}
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
                  onNavigateToVm={handleNavigateToVm}
                />
              </div>
            </Tab>
          </Tabs>
        </StackItem>
      </Stack>

      <DataSharingModal
        isOpen={isShareModalOpen}
        onConfirm={handleShareConfirm}
        onCancel={handleShareCancel}
        isLoading={isShareLoading}
        error={shareError}
      />
    </PageSection>
  );
};

ReportContainer.displayName = "ReportContainer";

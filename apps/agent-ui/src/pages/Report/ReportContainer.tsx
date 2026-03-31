import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  Inventory,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import {
  InventoryFromJSON,
  ResponseError,
  UpdateInventoryFromJSON,
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
import { Dashboard, VirtualMachinesView } from "./components/index";
import {
  filtersToByExpression,
  hasActiveFilters,
  searchParamsToFilters,
} from "./components/vmFilters";
import { Header } from "./Header";

// Helper type to access SDK configuration (workaround for SDK bug)
type ApiWithConfig = DefaultApiInterface & {
  configuration?: { basePath?: string };
};

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

  // Request ID for race condition prevention in VM fetching
  const vmsRequestIdRef = useRef(0);

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
  }>({
    clusters: [],
    datacenters: [],
    concernLabels: [],
    concernCategories: [],
  });
  const [filterOptionsFetched, setFilterOptionsFetched] = useState(false);

  // Parse filters from URL (recalculates when URL changes)
  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  // Determine initial tab based on URL params (only on mount)
  const [activeTab, setActiveTab] = useState<string | number>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "vms") return 1;
    // If there are VM filters in URL, open Virtual Machines tab
    if (hasActiveFilters(initialVMFilters)) return 1;
    return 0;
  });

  // Sync active tab with URL changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "vms" && activeTab !== 1) {
      setActiveTab(1);
    } else if ((tabParam === "overview" || !tabParam) && activeTab !== 0) {
      // Switch to overview if tab is explicitly "overview" or no tab param
      // Only check for VM filters if no tab param is set (legacy behavior)
      if (tabParam === "overview") {
        setActiveTab(0);
      } else if (!tabParam) {
        const currentFilters = searchParamsToFilters(searchParams);
        if (!hasActiveFilters(currentFilters)) {
          setActiveTab(0);
        }
      }
    }
  }, [searchParams, activeTab]);

  // Fetch inventory only (agent status comes from context)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Workaround: Fetch directly with native fetch API to bypass SDK bug
        // The published SDK has a bug where GetInventory200ResponseFromJSONTyped returns {}
        // when it receives snake_case JSON from the API
        const basePath =
          (agentApi as ApiWithConfig).configuration?.basePath ||
          `${window.location.origin}/agent/api/v1`;

        const httpResponse = await fetch(`${basePath}/inventory`);

        if (!httpResponse.ok) {
          throw new Error(
            `HTTP ${httpResponse.status}: ${httpResponse.statusText}`,
          );
        }

        const jsonData = await httpResponse.json();

        if (!jsonData) {
          setInventory(null);
          return;
        }

        // Check if response is an empty object - means inventory not collected yet
        if (
          typeof jsonData === "object" &&
          Object.keys(jsonData).length === 0
        ) {
          setInventory(null);
          return;
        }

        // Manually parse the JSON using the SDK converters
        let actualInventory: Inventory | null = null;

        // Check raw JSON structure (before SDK conversion)
        if ("vcenter_id" in jsonData && "clusters" in jsonData) {
          // It's an Inventory - parse it manually
          actualInventory = InventoryFromJSON(jsonData);
        } else if ("inventory" in jsonData) {
          // It's UpdateInventory - parse and extract
          const updateInventory = UpdateInventoryFromJSON(jsonData);
          if (updateInventory.inventory) {
            actualInventory = updateInventory.inventory;
          }
        }

        setInventory(actualInventory);
      } catch (err) {
        console.error("Error fetching inventory:", err);

        // Handle 404 specifically - inventory not collected yet
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

  // Compute available concerns and categories from inventory
  const availableConcerns = useMemo(() => {
    if (!inventory?.vcenter?.vms) return { labels: [], categories: [] };

    const concerns = new Set<string>();
    const warnings = inventory.vcenter.vms.migrationWarnings || [];
    const errors = inventory.vcenter.vms.notMigratableReasons || [];

    // Collect all unique concern labels
    [...warnings, ...errors].forEach((issue) => {
      if (issue.label) {
        concerns.add(issue.label);
      }
    });

    // All possible categories according to backend
    const categories = [
      "Critical",
      "Warning",
      "Information",
      "Advisory",
      "Error",
      "Other",
    ];

    return {
      labels: Array.from(concerns).sort(),
      categories: categories,
    };
  }, [inventory]);

  // Fetch available filter options once when VMs tab is first accessed
  useEffect(() => {
    if (activeTab !== 1) return;
    if (filterOptionsFetched) return;
    if (!inventory) return;

    const fetchFilterOptions = async () => {
      try {
        // Fetch all VMs with pagination to get complete lists of clusters and datacenters
        let allVMs: VirtualMachine[] = [];
        let page = 1;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const response = await agentApi.getVMs({
            page,
            pageSize,
          });

          const vms = response.vms || [];
          allVMs = allVMs.concat(vms);

          // Check if there are more pages
          const total = response.total || 0;
          hasMore = allVMs.length < total;
          page++;
        }

        const clusters = new Set<string>();
        const datacenters = new Set<string>();

        allVMs.forEach((vm) => {
          if (vm.cluster) clusters.add(vm.cluster);
          if (vm.datacenter) datacenters.add(vm.datacenter);
        });

        setAvailableFilterOptions({
          clusters: Array.from(clusters).sort(),
          datacenters: Array.from(datacenters).sort(),
          concernLabels: availableConcerns.labels,
          concernCategories: availableConcerns.categories,
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
  }, [activeTab, agentApi, filterOptionsFetched, availableConcerns, inventory]);

  // Fetch VMs when Virtual Machines tab is active or filters change
  useEffect(() => {
    if (activeTab !== 1) return;

    const fetchVMs = async () => {
      // Increment request ID and capture current value to detect stale responses
      vmsRequestIdRef.current += 1;
      const currentRequestId = vmsRequestIdRef.current;

      try {
        setVmsLoading(true);

        // Convert filters to backend expression format
        const byExpression = filtersToByExpression(initialVMFilters);

        // Fetch page with backend filtering
        const response = await agentApi.getVMs({
          byExpression,
          sort: vmsSortFields.length > 0 ? vmsSortFields : undefined,
          page: vmsPage,
          pageSize: vmsPageSize,
        });

        // Only update state if this is still the latest request
        if (currentRequestId === vmsRequestIdRef.current) {
          setVmsList(response.vms || []);
          setVmsTotalCount(response.total || 0);
        }
      } catch (err) {
        console.error("Error fetching VMs:", err);
        // Only update state if this is still the latest request
        if (currentRequestId === vmsRequestIdRef.current) {
          setVmsList([]);
          setVmsTotalCount(0);
        }
      } finally {
        // Only update loading state if this is still the latest request
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
    const reqId = ++vmsRequestIdRef.current;
    try {
      const byExpression = filtersToByExpression(initialVMFilters);
      const response = await agentApi.getVMs({
        byExpression,
        sort: vmsSortFields.length > 0 ? vmsSortFields : undefined,
        page: vmsPage,
        pageSize: vmsPageSize,
      });
      if (vmsRequestIdRef.current === reqId) {
        setVmsList(response.vms || []);
        setVmsTotalCount(response.total || 0);
      }
    } catch (err) {
      console.error("Error refreshing VMs:", err);
    }
  }, [agentApi, initialVMFilters, vmsSortFields, vmsPage, vmsPageSize]);

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Stack hasGutter>
          <StackItem>
            <Header totalVMs={0} totalClusters={0} isConnected={false} />
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
            <Header totalVMs={0} totalClusters={0} isConnected={false} />
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
            <Header totalVMs={0} totalClusters={0} isConnected={false} />
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
      // Workaround: Fetch directly to bypass SDK bug (same as in the main fetch)
      const basePath =
        (agentApi as ApiWithConfig).configuration?.basePath ||
        `${window.location.origin}/agent/api/v1`;

      const httpResponse = await fetch(
        `${basePath}/inventory?withAgentId=true`,
      );

      if (!httpResponse.ok) {
        throw new Error(
          `HTTP ${httpResponse.status}: ${httpResponse.statusText}`,
        );
      }

      const jsonData = await httpResponse.json();

      // Ensure the downloaded JSON is in UpdateInventory format
      // The API may return a plain Inventory (with vcenter_id at top level)
      // or an UpdateInventory wrapper ({ agent_id: "...", inventory: {...} })
      let downloadData = jsonData;
      if (jsonData && !("inventory" in jsonData) && "vcenter_id" in jsonData) {
        const agentId = jsonData.agent_id || jsonData.agentId || "";
        delete jsonData.agent_id;
        downloadData = { agent_id: agentId, inventory: jsonData };
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
      // Reset to Overview tab when changing cluster
      setActiveTab(0);
      // Update URL to reflect tab change and clear all VM filters
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("tab");
      // Clear all VM filter keys (same as handleTabSelect does)
      newParams.delete("statuses");
      newParams.delete("hasIssues");
      newParams.delete("noIssues");
      newParams.delete("clusters");
      newParams.delete("datacenters");
      newParams.delete("search");
      newParams.delete("diskRangeMin");
      newParams.delete("diskRangeMax");
      newParams.delete("memoryRangeMin");
      newParams.delete("memoryRangeMax");
      newParams.delete("migrationReadiness");
      newParams.delete("concernLabels");
      newParams.delete("concernCategories");
      setSearchParams(newParams, { replace: true });
    }
    setIsClusterSelectOpen(false);
  };

  const handleTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setActiveTab(tabIndex);
    // Update URL with tab parameter
    const newParams = new URLSearchParams(searchParams);
    if (tabIndex === 1) {
      newParams.set("tab", "vms");
      // Reset pagination when switching to VMs tab
      setVmsPage(1);
    } else {
      newParams.set("tab", "overview");
      // Clear all VM filters when switching away from VMs tab
      newParams.delete("statuses");
      newParams.delete("hasIssues");
      newParams.delete("noIssues");
      newParams.delete("clusters");
      newParams.delete("datacenters");
      newParams.delete("search");
      newParams.delete("diskRangeMin");
      newParams.delete("diskRangeMax");
      newParams.delete("memoryRangeMin");
      newParams.delete("memoryRangeMax");
      newParams.delete("migrationReadiness");
      newParams.delete("concernLabels");
      newParams.delete("concernCategories");
    }
    setSearchParams(newParams, { replace: true });
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
    // Switch to VMs tab and apply concern filter
    setActiveTab(1);

    // Update URL with concern filter
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "vms");
    newParams.set("concernLabels", concernLabel);
    setSearchParams(newParams, { replace: true });

    // Reset pagination
    setVmsPage(1);
  };

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <Stack hasGutter>
        {/* Header with cluster selector */}
        <StackItem>
          <Header
            totalVMs={totalVMs}
            totalClusters={totalClusters}
            isConnected={isDataShared}
          />
        </StackItem>

        {/* Data Sharing Alert - shown when not shared */}
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

        {/* Tabs */}
        <StackItem>
          <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
            <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
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
              eventKey={1}
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
                  availableFilterOptions={availableFilterOptions}
                  agentApi={agentApi}
                  onRefreshVMs={refreshVMs}
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

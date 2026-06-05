import { useInjection } from "@migration-planner-ui/ioc";
import {
  type DefaultApiInterface,
  type Group,
  GroupFromJSON,
  type Inventory,
  type VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
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
  Title,
} from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAgentStatus } from "../../common/AgentStatusContext";
import { Symbols } from "../../main/Symbols";
import { getAgentApiBasePath } from "./agentApiConfig";
import { buildClusterViewModel, type ClusterOption } from "./clusterView";
import { Dashboard, VirtualMachinesView } from "./components";
import { DeleteGroupModal } from "./components/DeleteGroupModal";
import { EditGroupNameModal } from "./components/EditGroupNameModal";
import { combineFilterExpressions } from "./components/groupFilters";
import {
  filtersToByExpression,
  hasActiveFilters,
  searchParamsToFilters,
} from "./components/vmFilters";
import { Header } from "./Header";
import {
  getInventoryAggregateView,
  parseInventoryFromJson,
} from "./inventoryParsing";

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const { agentStatus } = useAgentStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [group, setGroup] = useState<Group | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
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
  const [showExcludedVMs, setShowExcludedVMs] = useState(true);
  const [availableFilterOptions, setAvailableFilterOptions] = useState({
    clusters: [] as string[],
    datacenters: [] as string[],
    concernLabels: [] as string[],
    concernCategories: [] as string[],
    vmLabels: [] as string[],
  });
  const [filterOptionsFetched, setFilterOptionsFetched] = useState(false);

  const vmsRequestIdRef = useRef(0);
  const vmsRefreshIdRef = useRef(0);

  const initialVMFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    [searchParams],
  );

  const [activeTab, setActiveTab] = useState<string | number>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "vms") return 1;
    if (hasActiveFilters(initialVMFilters)) return 1;
    return 0;
  });

  const groupFilter = group?.filter;

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

        const basePath = getAgentApiBasePath(agentApi);
        const httpResponse = await fetch(
          `${basePath}/groups/${encodeURIComponent(groupId)}?page=1&pageSize=1`,
          { cache: "no-store" },
        );

        if (httpResponse.status === 404) {
          setError("Group not found.");
          return;
        }
        if (!httpResponse.ok) {
          throw new Error(
            `HTTP ${httpResponse.status}: ${httpResponse.statusText}`,
          );
        }

        const jsonData = await httpResponse.json();
        if (!jsonData?.group) {
          setError("Group not found.");
          return;
        }

        setGroup(GroupFromJSON(jsonData.group));
        setVmsTotalCount(jsonData.total ?? 0);
        setInventory(parseInventoryFromJson(jsonData.inventory));
      } catch (err) {
        console.error("Error loading group detail:", err);
        setError(err instanceof Error ? err.message : "Failed to load group.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [agentApi, groupId]);

  useEffect(() => {
    if (activeTab !== 1 || filterOptionsFetched) {
      return;
    }

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
        setFilterOptionsFetched(true);
      }
    };

    fetchFilterOptions();
  }, [activeTab, agentApi, filterOptionsFetched]);

  useEffect(() => {
    if (activeTab !== 1 || !groupFilter) {
      return;
    }

    const fetchVMs = async () => {
      vmsRequestIdRef.current += 1;
      const currentRequestId = vmsRequestIdRef.current;

      try {
        setVmsLoading(true);
        const effectiveFilters = { ...initialVMFilters, showExcludedVMs };
        const userExpression = filtersToByExpression(effectiveFilters);
        const byExpression = combineFilterExpressions(
          groupFilter,
          userExpression,
        );

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
    showExcludedVMs,
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
      const effectiveFilters = { ...initialVMFilters, showExcludedVMs };
      const userExpression = filtersToByExpression(effectiveFilters);
      const byExpression = combineFilterExpressions(
        groupFilter,
        userExpression,
      );
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
      console.error("Error refreshing group VMs:", err);
    }
  }, [
    agentApi,
    groupFilter,
    initialVMFilters,
    showExcludedVMs,
    vmsSortFields,
    vmsPage,
    vmsPageSize,
  ]);

  const reloadGroupMembership = useCallback(async () => {
    if (!groupId) {
      return;
    }

    try {
      const basePath = getAgentApiBasePath(agentApi);
      const httpResponse = await fetch(
        `${basePath}/groups/${encodeURIComponent(groupId)}?page=1&pageSize=1`,
        { cache: "no-store" },
      );
      if (!httpResponse.ok) {
        return;
      }

      const jsonData = await httpResponse.json();
      if (!jsonData?.group) {
        return;
      }

      setGroup(GroupFromJSON(jsonData.group));
      setInventory(parseInventoryFromJson(jsonData.inventory));
      setVmsTotalCount(jsonData.total ?? 0);
      setVmsPage(1);
    } catch (err) {
      console.error("Error reloading group after membership change:", err);
    }
  }, [agentApi, groupId]);

  const handleTabSelect = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setActiveTab(tabIndex);
    const newParams = new URLSearchParams(searchParams);
    if (tabIndex === 1) {
      newParams.set("tab", "vms");
      setVmsPage(1);
    } else {
      newParams.set("tab", "overview");
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClusterSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ): void => {
    if (typeof value === "string") {
      setSelectedClusterId(value);
      setActiveTab(0);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("tab");
      setSearchParams(newParams, { replace: true });
    }
    setIsClusterSelectOpen(false);
  };

  const handleUpdateGroupName = async (name: string) => {
    if (!group) {
      return;
    }
    const updated = await agentApi.updateGroup({
      id: group.id,
      updateGroupRequest: { name },
    });
    setGroup(updated);
  };

  const handleDeleteGroup = async () => {
    if (!group) {
      return;
    }
    await agentApi.deleteGroup({ id: group.id });
    navigate("/report/groups");
  };

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
        <Content component="p">Loading group...</Content>
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
  const discoveryStatus = agentStatus?.console_connection
    ? agentStatus.console_connection.charAt(0).toUpperCase() +
      agentStatus.console_connection.slice(1)
    : "Unknown";

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div>
              <Title headingLevel="h1" size="2xl">
                {group.name}
              </Title>
              <Content component="p" style={{ marginTop: "8px" }}>
                Discovery VM status: {discoveryStatus}
              </Content>
            </div>
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
          </div>
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
              eventKey={0}
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
                      infra={clusterView.viewInfra}
                      cpuCores={clusterView.cpuCores}
                      ramGB={clusterView.ramGB}
                      vms={clusterView.viewVms}
                      clusters={clusterView.viewClusters}
                      isAggregateView={clusterView.isAggregateView}
                      clusterFound={clusterView.clusterFound}
                      scopedFilterExpression={group.filter}
                    />
                  </div>
                ) : (
                  <Content component="p" style={{ marginTop: "16px" }}>
                    No assessment data is available for this group yet.
                  </Content>
                )}
              </div>
            </Tab>
            <Tab
              eventKey={1}
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
                  onGroupMembershipChanged={reloadGroupMembership}
                  showExcludedVMs={showExcludedVMs}
                  onShowExcludedVMsChange={(show) => {
                    setShowExcludedVMs(show);
                    setVmsPage(1);
                  }}
                  groupContext={{ id: group.id, name: group.name }}
                  scopedFilterExpression={group.filter}
                  sortFields={vmsSortFields}
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

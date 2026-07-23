import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AddLabelsModal } from "../../../Groups/components/modals/AddLabelsModal";
import { AddToGroupModal } from "../../../Groups/components/modals/AddToGroupModal";
import { CreateGroupFromSelectionModal } from "../../../Groups/components/modals/CreateGroupFromSelectionModal";
import { ManageLabelsModal } from "../../../Groups/components/modals/ManageLabelsModal";
import { RemoveFromGroupModal } from "../../../Groups/components/modals/RemoveFromGroupModal";
import { combineFilterExpressions } from "../../../Groups/utils/groupFilters";
import { invalidateAllGroupsCache } from "../../../Groups/utils/groupList";
import {
  buildVmGroupMembership,
  mergeVmGroupItems,
  type VmGroupMembershipData,
} from "../../../Groups/utils/vmGroupMembership";
import { buildVmDetailUrl } from "../../../reportTabNavigation";
import { getAgentApiBasePath } from "../../agentApiConfig";
import type { MigrationExcludedInventoryChange } from "../../inventoryParsing";
import {
  buildVmApplicationsMap,
  mergeVmApplicationNames,
} from "../ApplicationsTab/applicationsApi";
import { DeepInspectionModal } from "./DeepInspectionModal";
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import {
  mergeGroupNamesIntoFilterOptions,
  type RefreshFilterOptionsFn,
} from "./vmFilterOptions";
import {
  filtersToByExpression,
  type VMFilters,
  withDefaultReportInclusion,
} from "./vmFilters";
import {
  cancelVmInspectionWithRetry,
  getDeepInspectionEnablement,
} from "./vmInspectionUtils";
import {
  fetchAllMatchingVmIds,
  fetchAllMatchingVms,
  fetchVmsByIds,
} from "./vmSelection";
import {
  type ClientSortAllVmColumn,
  isClientSortAllVmsColumn,
} from "./vmTableShared";

async function updateVmMigrationExcluded(
  agentApi: DefaultApiInterface,
  vmIds: string[],
  migrationExcluded: boolean,
  knownVms: VirtualMachine[],
  onRefreshVMs?: () => void | Promise<void>,
  onRefreshInventory?: (
    change: MigrationExcludedInventoryChange,
  ) => void | Promise<void>,
): Promise<void> {
  if (vmIds.length === 0) {
    return;
  }

  let successfulIds: string[];
  const failedIds: string[] = [];

  if (vmIds.length > 1) {
    try {
      await agentApi.batchUpdateVMExclusion({
        batchUpdateExclusionRequest: { vmIds, migrationExcluded },
      });
      successfulIds = vmIds;
    } catch (err) {
      console.error("Error batch updating VM exclusion:", err);
      await onRefreshVMs?.();
      throw err;
    }
  } else {
    const results = await Promise.allSettled(
      vmIds.map((id) =>
        agentApi.updateVM({
          id,
          virtualMachineUpdateRequest: { migrationExcluded },
        }),
      ),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        failedIds.push(vmIds[i]);
        console.error(`Error updating VM ${vmIds[i]}:`, result.reason);
      }
    }

    successfulIds = vmIds.filter((id) => !failedIds.includes(id));
  }

  // Use pre-change exclusion state so bulk exclude/include stays accurate even if
  // the table list has not refreshed yet from a prior operation.
  const affectedVms = successfulIds.map((id) => {
    const vm = knownVms.find((candidate) => candidate.id === id);
    return {
      ...(vm ?? {
        id,
        name: id,
        vCenterState: "",
        cluster: "",
        datacenter: "",
        diskSize: 0,
        memory: 0,
        issueCount: 0,
        migratable: false,
      }),
      migrationExcluded: !migrationExcluded,
    };
  });

  if (successfulIds.length > 0) {
    await onRefreshInventory?.({
      vmIds: successfulIds,
      excluded: migrationExcluded,
      affectedVms,
    });
  }
  await onRefreshVMs?.();

  if (failedIds.length > 0) {
    throw new Error(
      `Failed to update ${failedIds.length} of ${vmIds.length} VM(s): ${failedIds.join(", ")}`,
    );
  }
}

interface VirtualMachinesViewProps {
  vms: VirtualMachine[];
  loading?: boolean;
  initialFilters?: VMFilters;
  totalVMs?: number;
  currentPage?: number;
  pageSize?: number;
  onFiltersChange?: (filters: VMFilters) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sortFields: string[]) => void;
  availableFilterOptions?: {
    clusters: string[];
    datacenters: string[];
    concernLabels: string[];
    concernCategories: string[];
    vmLabels: string[];
    groups: string[];
    applications: string[];
  };
  agentApi?: DefaultApiInterface;
  onRefreshVMs?: () => void;
  /** Refresh assessment report inventory after exclude/include from migration. */
  onRefreshInventory?: (
    change: MigrationExcludedInventoryChange,
  ) => void | Promise<void>;
  /** Reload group metadata/filter after add/remove (group detail page). */
  onGroupMembershipChanged?: () => void | Promise<void>;
  /** Refresh filter dropdown options (e.g. after groups or labels change). */
  onRefreshFilterOptions?: RefreshFilterOptionsFn;
  /** When set, VMs are shown inside this group's detail page */
  groupContext?: { id: string; name: string };
  /** Base filter applied before table filters (e.g. group membership). */
  scopedFilterExpression?: string;
  sortFields?: string[];
}

export const VirtualMachinesView: React.FC<VirtualMachinesViewProps> = ({
  vms,
  loading = false,
  initialFilters,
  totalVMs,
  currentPage = 1,
  pageSize = 20,
  onFiltersChange,
  onPageChange,
  onSortChange,
  availableFilterOptions,
  agentApi,
  onRefreshVMs,
  onRefreshInventory,
  onGroupMembershipChanged,
  onRefreshFilterOptions,
  groupContext,
  scopedFilterExpression,
  sortFields = [],
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = groupContext ? "groups" : "overview";
  const [selectedVMId, setSelectedVMId] = useState<string | null>(null);
  const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set());
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionActive, setInspectionActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRefreshVMsRef = useRef(onRefreshVMs);
  // Tracks whether the current run has been observed in running/pending state
  // at least once. Guards against stopping the poll too early when VMs still
  // carry a terminal inspectionStatus from a previous run at the moment the
  // first refresh returns (before the server updates them to "pending").
  const seenRunningRef = useRef(false);
  // Number of poll responses received since the current run started.
  // Incremented inside the setInterval callback (not in the render-triggered
  // effect) so it counts actual server round-trips, not React re-renders.
  const pollTicksRef = useRef(0);
  // Minimum poll ticks before we allow the "allDone" check to stop polling.
  // Gives the server time to transition VMs to "pending" even when the very
  // first response still carries stale terminal states from a previous run.
  const MIN_POLL_TICKS_BEFORE_DONE = 2;
  // Fallback ceiling to avoid polling forever.
  const MAX_POLL_TICKS = 60;
  const POLL_INTERVAL_MS = 5000;
  const CANCEL_POLL_INTERVAL_MS = 2000;

  const [cancelingInspectionVmIds, setCancelingInspectionVmIds] = useState(
    () => new Set<string>(),
  );

  useEffect(() => {
    onRefreshVMsRef.current = onRefreshVMs;
  }, [onRefreshVMs]);

  const vmIdParam = searchParams.get("vmId");
  const vmSectionParam = searchParams.get("vmSection");

  useEffect(() => {
    if (vmIdParam) {
      setSelectedVMId(vmIdParam);
    }
  }, [vmIdParam]);

  // Labels state
  const [isAddLabelsModalOpen, setIsAddLabelsModalOpen] = useState(false);
  const [addLabelsMode, setAddLabelsMode] = useState<"add" | "edit">("add");
  const [isManageLabelsModalOpen, setIsManageLabelsModalOpen] = useState(false);
  const [addLabelsVMIds, setAddLabelsVMIds] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
  const [isRemoveFromGroupModalOpen, setIsRemoveFromGroupModalOpen] =
    useState(false);
  const [groupActionVMIds, setGroupActionVMIds] = useState<string[]>([]);
  const [vmGroupMembership, setVmGroupMembership] =
    useState<VmGroupMembershipData>({
      vmIdToGroups: {},
      groupsByName: {},
    });
  const [vmApplicationsMap, setVmApplicationsMap] = useState<
    Map<string, string[]>
  >(new Map());
  const [clientSortColumn, setClientSortColumn] =
    useState<ClientSortAllVmColumn | null>(null);
  const [allVmsForClientSort, setAllVmsForClientSort] = useState<
    VirtualMachine[] | null
  >(null);
  const [clientSortLoading, setClientSortLoading] = useState(false);
  const [offPageSelectedVms, setOffPageSelectedVms] = useState<
    VirtualMachine[]
  >([]);
  const [offPageSelectionLoadFailed, setOffPageSelectionLoadFailed] =
    useState(false);

  const basePath = useMemo(
    () => (agentApi ? getAgentApiBasePath(agentApi) : ""),
    [agentApi],
  );

  const loadVmGroupMembership = useCallback(async () => {
    if (!agentApi) {
      return;
    }
    try {
      const membership = await buildVmGroupMembership(agentApi);
      setVmGroupMembership(membership);
    } catch (err) {
      console.error("Error loading VM group membership:", err);
    }
  }, [agentApi]);

  useEffect(() => {
    void loadVmGroupMembership();
  }, [loadVmGroupMembership]);

  const loadVmApplications = useCallback(async () => {
    if (!agentApi) {
      return;
    }
    try {
      const response = await agentApi.getApplications();
      setVmApplicationsMap(buildVmApplicationsMap(response.applications ?? []));
    } catch (err) {
      console.warn("Error fetching applications for VM table:", err);
      setVmApplicationsMap(new Map());
    }
  }, [agentApi]);

  useEffect(() => {
    void loadVmApplications();
  }, [loadVmApplications]);

  const clientSortFilterExpression = useMemo(() => {
    const userExpression = filtersToByExpression(
      withDefaultReportInclusion(initialFilters ?? {}),
    );
    return combineFilterExpressions(scopedFilterExpression, userExpression);
  }, [initialFilters, scopedFilterExpression]);

  useEffect(() => {
    if (!isClientSortAllVmsColumn(clientSortColumn) || !agentApi) {
      setAllVmsForClientSort(null);
      setClientSortLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setClientSortLoading(true);
        const fetched = await fetchAllMatchingVms(agentApi, {
          byExpression: clientSortFilterExpression,
        });
        if (!cancelled) {
          setAllVmsForClientSort(fetched);
        }
      } catch (err) {
        console.error("Error fetching VMs for client-side sort:", err);
        if (!cancelled) {
          setAllVmsForClientSort(null);
        }
      } finally {
        if (!cancelled) {
          setClientSortLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [agentApi, clientSortColumn, clientSortFilterExpression]);

  const sourceVms = useMemo(() => {
    if (isClientSortAllVmsColumn(clientSortColumn) && allVmsForClientSort) {
      return allVmsForClientSort;
    }
    return vms;
  }, [allVmsForClientSort, clientSortColumn, vms]);

  const tableTotalVMs = useMemo(() => {
    if (isClientSortAllVmsColumn(clientSortColumn) && allVmsForClientSort) {
      return allVmsForClientSort.length;
    }
    return totalVMs;
  }, [allVmsForClientSort, clientSortColumn, totalVMs]);

  const vmsForTable = useMemo(
    () =>
      mergeVmApplicationNames(
        mergeVmGroupItems(sourceVms, vmGroupMembership),
        vmApplicationsMap,
      ),
    [sourceVms, vmGroupMembership, vmApplicationsMap],
  );

  const mergedFilterOptions = useMemo(
    () =>
      mergeGroupNamesIntoFilterOptions(
        availableFilterOptions,
        Object.values(vmGroupMembership.groupsByName).map(
          (group) => group.name,
        ),
      ),
    [availableFilterOptions, vmGroupMembership.groupsByName],
  );

  const visibleVms = vmsForTable;

  const visibleVmIds = useMemo(
    () => new Set(vmsForTable.map((vm) => vm.id)),
    [vmsForTable],
  );

  useEffect(() => {
    if (!agentApi) {
      setOffPageSelectedVms([]);
      setOffPageSelectionLoadFailed(false);
      return;
    }

    const missingIds = [...selectedVMs].filter((id) => !visibleVmIds.has(id));
    if (missingIds.length === 0) {
      setOffPageSelectedVms([]);
      setOffPageSelectionLoadFailed(false);
      return;
    }

    let cancelled = false;
    setOffPageSelectionLoadFailed(false);
    void (async () => {
      try {
        const fetched = await fetchVmsByIds(agentApi, missingIds);
        if (!cancelled) {
          setOffPageSelectedVms(fetched);
          setOffPageSelectionLoadFailed(false);
        }
      } catch (err) {
        console.error("Error fetching selected VM inspection context:", err);
        if (!cancelled) {
          setOffPageSelectedVms([]);
          setOffPageSelectionLoadFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentApi, selectedVMs, visibleVmIds]);

  const inspectionContextVms = useMemo((): VirtualMachine[] => {
    const byId = new Map<string, VirtualMachine>();
    for (const vm of vmsForTable) {
      byId.set(vm.id, vm);
    }
    for (const vm of offPageSelectedVms) {
      byId.set(vm.id, vm);
    }
    return [...byId.values()];
  }, [offPageSelectedVms, vmsForTable]);

  const selectionContextLoadFailed = useMemo(() => {
    if (!offPageSelectionLoadFailed) {
      return false;
    }
    return [...selectedVMs].some((id) => !visibleVmIds.has(id));
  }, [offPageSelectionLoadFailed, selectedVMs, visibleVmIds]);

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

  useEffect(() => {
    if (isAddLabelsModalOpen) {
      void fetchAvailableLabels();
    }
  }, [isAddLabelsModalOpen, fetchAvailableLabels]);

  const currentVMLabels = useMemo(() => {
    if (addLabelsVMIds.length === 0) return [];
    const labelSet = new Set<string>();
    for (const vm of vms) {
      if (addLabelsVMIds.includes(vm.id)) {
        const vmLabels = (vm as VirtualMachine & { labels?: string[] }).labels;
        if (vmLabels) {
          for (const l of vmLabels) labelSet.add(l);
        }
      }
    }
    return [...labelSet].sort();
  }, [addLabelsVMIds, vms]);

  const selectedVMName = useMemo(() => {
    if (addLabelsVMIds.length !== 1) return undefined;
    const vm = vms.find((v) => v.id === addLabelsVMIds[0]);
    return vm?.name;
  }, [addLabelsVMIds, vms]);

  const handleAddLabels = useCallback(
    (vmIds: string[]) => {
      setAddLabelsVMIds(vmIds);
      setAddLabelsMode("add");
      void fetchAvailableLabels();
      setIsAddLabelsModalOpen(true);
    },
    [fetchAvailableLabels],
  );

  const handleEditLabels = useCallback(
    (vmIds: string[]) => {
      setAddLabelsVMIds(vmIds);
      setAddLabelsMode("edit");
      void fetchAvailableLabels();
      setIsAddLabelsModalOpen(true);
    },
    [fetchAvailableLabels],
  );

  const handleManageLabels = useCallback(() => {
    setIsManageLabelsModalOpen(true);
  }, []);

  const groupNamesForRemoval = useMemo(() => {
    if (groupContext) {
      return [groupContext.name];
    }
    const names = new Set<string>();
    for (const vmId of groupActionVMIds) {
      const vm = vmsForTable.find((v) => v.id === vmId);
      for (const group of vm?.groupItems ?? []) {
        names.add(group.name);
      }
    }
    return [...names];
  }, [groupActionVMIds, groupContext, vmsForTable]);

  const groupActionVmNames = useMemo(
    () =>
      groupActionVMIds
        .map((id) => vms.find((vm) => vm.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [groupActionVMIds, vms],
  );

  const handleCreateGroup = useCallback((vmIds: string[]) => {
    setGroupActionVMIds(vmIds);
    setIsCreateGroupModalOpen(true);
  }, []);

  const handleAddToGroup = useCallback((vmIds: string[]) => {
    setGroupActionVMIds(vmIds);
    setIsAddToGroupModalOpen(true);
  }, []);

  const handleRemoveFromGroup = useCallback((vmIds: string[]) => {
    setGroupActionVMIds(vmIds);
    setIsRemoveFromGroupModalOpen(true);
  }, []);

  const handleGroupsChanged = useCallback(async () => {
    if (agentApi) {
      invalidateAllGroupsCache(agentApi);
    }
    await onRefreshFilterOptions?.({ force: true });
    if (onGroupMembershipChanged) {
      await onGroupMembershipChanged();
      await loadVmGroupMembership();
      return;
    }
    await loadVmGroupMembership();
    onRefreshVMs?.();
  }, [
    agentApi,
    loadVmGroupMembership,
    onGroupMembershipChanged,
    onRefreshFilterOptions,
    onRefreshVMs,
  ]);

  const handleGroupActionComplete = useCallback(async () => {
    await handleGroupsChanged();
    setSelectedVMs(new Set());
  }, [handleGroupsChanged]);

  const handleFetchAllVmIds = useCallback(
    async (filters: VMFilters) => {
      if (!agentApi) {
        return [];
      }
      const userExpression = filtersToByExpression(
        withDefaultReportInclusion(filters),
      );
      const byExpression = combineFilterExpressions(
        scopedFilterExpression,
        userExpression,
      );
      return fetchAllMatchingVmIds(agentApi, {
        byExpression,
        sort: sortFields.length > 0 ? sortFields : undefined,
      });
    },
    [agentApi, scopedFilterExpression, sortFields],
  );

  const refreshLabels = useCallback(async () => {
    await fetchAvailableLabels();
    onRefreshVMs?.();
  }, [fetchAvailableLabels, onRefreshVMs]);

  const handleSubmitLabels = useCallback(
    async (labelsToAdd: string[], labelsToRemove: string[]) => {
      if (!agentApi) {
        return;
      }
      const vmIds = addLabelsVMIds;

      const addPromises = labelsToAdd.map((label) =>
        agentApi.updateLabelVMs({
          label,
          updateLabelVMsRequest: { add: vmIds },
        }),
      );

      const removePromises = labelsToRemove.map((label) =>
        agentApi.updateLabelVMs({
          label,
          updateLabelVMsRequest: { remove: vmIds },
        }),
      );

      await Promise.all([...addPromises, ...removePromises]);
      await refreshLabels();
      setSelectedVMs(new Set());
    },
    [addLabelsVMIds, agentApi, refreshLabels],
  );

  const handleVMClick = (vmId: string) => {
    setSelectedVMId(vmId);
    setSearchParams(buildVmDetailUrl(searchParams, vmId), { replace: true });
  };

  const handleVMApplicationsClick = (vmId: string) => {
    setSelectedVMId(vmId);
    setSearchParams(
      buildVmDetailUrl(searchParams, vmId, { section: "applications" }),
      { replace: true },
    );
  };

  const handleScrollToSectionComplete = useCallback(() => {
    if (!searchParams.has("vmSection")) {
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("vmSection");
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleBack = () => {
    setSelectedVMId(null);
    if (searchParams.has("vmId") || searchParams.has("vmSection")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("vmId");
      newParams.delete("vmSection");
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleRunDeepInspection = (includeVmId?: string) => {
    if (selectionContextLoadFailed) {
      return;
    }

    const merged = new Set(selectedVMs);
    if (includeVmId) {
      merged.add(includeVmId);
    }

    const enablement = getDeepInspectionEnablement(
      merged,
      inspectionContextVms,
    );
    if (!enablement.enabled) {
      return;
    }

    setSelectedVMs(merged);
    setIsInspectionModalOpen(true);
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const shouldPoll = inspectionActive || cancelingInspectionVmIds.size > 0;
  const pollIntervalMs =
    cancelingInspectionVmIds.size > 0
      ? CANCEL_POLL_INTERVAL_MS
      : POLL_INTERVAL_MS;

  useEffect(() => {
    if (!shouldPoll) {
      stopPolling();
      return;
    }

    stopPolling();
    pollingRef.current = setInterval(() => {
      pollTicksRef.current += 1;
      onRefreshVMsRef.current?.();
    }, pollIntervalMs);

    return () => stopPolling();
  }, [shouldPoll, pollIntervalMs, stopPolling]);

  const handleCancelInspection = useCallback(
    async (vmId: string) => {
      if (!agentApi) return;

      setCancelingInspectionVmIds((prev) => new Set(prev).add(vmId));
      try {
        await cancelVmInspectionWithRetry(basePath, vmId);
        await onRefreshVMs?.();
      } catch (err) {
        setCancelingInspectionVmIds((prev) => {
          const next = new Set(prev);
          next.delete(vmId);
          return next;
        });
        throw err;
      }
    },
    [agentApi, basePath, onRefreshVMs],
  );

  const handleExcludeFromReports = useCallback(
    async (vmIds: string[]) => {
      if (!agentApi) return;
      await updateVmMigrationExcluded(
        agentApi,
        vmIds,
        true,
        vmsForTable,
        onRefreshVMs,
        onRefreshInventory,
      );
    },
    [agentApi, onRefreshVMs, onRefreshInventory, vmsForTable],
  );

  const handleIncludeInReports = useCallback(
    async (vmIds: string[]) => {
      if (!agentApi) return;
      await updateVmMigrationExcluded(
        agentApi,
        vmIds,
        false,
        vmsForTable,
        onRefreshVMs,
        onRefreshInventory,
      );
    },
    [agentApi, onRefreshVMs, onRefreshInventory, vmsForTable],
  );

  const handleResetInspection = useCallback(async () => {
    if (!agentApi) return;
    try {
      await agentApi.stopInspection();
      setInspectionActive(false);
      onRefreshVMs?.();
    } catch (err) {
      console.error("Error stopping inspection for reset:", err);
    }
    setIsInspectionModalOpen(true);
  }, [agentApi, onRefreshVMs]);

  const handleInspectionStarted = useCallback(() => {
    seenRunningRef.current = false;
    pollTicksRef.current = 0;
    setInspectionActive(true);
    setSelectedVMs(new Set());
    onRefreshVMsRef.current?.();
  }, []);

  useEffect(() => {
    if (!inspectionActive) return;

    const hasRunningOrPending = vms.some(
      (vm) =>
        vm.inspectionStatus?.state === "running" ||
        vm.inspectionStatus?.state === "pending",
    );

    if (hasRunningOrPending) {
      seenRunningRef.current = true;
    }

    const ticks = pollTicksRef.current;

    // Two ways to know the run finished:
    // 1. We observed running/pending at some point and now all VMs left that
    //    state (the original fast-path).
    // 2. We've waited at least MIN_POLL_TICKS_BEFORE_DONE server round-trips
    //    and no VM is running/pending. This covers the re-run case where the
    //    inspection completes so fast that we never catch the transient
    //    running/pending state — after a few ticks the server has had enough
    //    time to transition VMs, so terminal states are trustworthy.
    // The MAX_POLL_TICKS ceiling only applies when no VM is still active —
    // if VMs are genuinely running we must keep polling regardless of how
    // long it takes.
    const seenAndDone = seenRunningRef.current && !hasRunningOrPending;
    const waitedAndDone =
      ticks >= MIN_POLL_TICKS_BEFORE_DONE && !hasRunningOrPending;
    const exhausted = ticks >= MAX_POLL_TICKS && !hasRunningOrPending;

    if (seenAndDone || waitedAndDone || exhausted) {
      setInspectionActive(false);
    }
  }, [vms, inspectionActive]);

  useEffect(() => {
    if (cancelingInspectionVmIds.size === 0) return;

    setCancelingInspectionVmIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const vmId of prev) {
        const vm = vms.find((v) => v.id === vmId);
        const state = vm?.inspectionStatus?.state;
        if (state && state !== "running" && state !== "pending") {
          next.delete(vmId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [vms, cancelingInspectionVmIds.size]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  if (selectedVMId) {
    const selectedVM = vms.find((vm) => vm.id === selectedVMId);
    return (
      <VMDetailsPage
        vmId={selectedVMId}
        onBack={handleBack}
        inspectionStatus={selectedVM?.inspectionStatus}
        scrollToSection={vmSectionParam}
        onScrollToSectionComplete={handleScrollToSectionComplete}
      />
    );
  }

  return (
    <>
      <VMTable
        vms={visibleVms}
        loading={loading || clientSortLoading}
        onVMClick={handleVMClick}
        onVMApplicationsClick={handleVMApplicationsClick}
        initialFilters={initialFilters}
        totalVMs={tableTotalVMs}
        currentPage={currentPage}
        pageSize={pageSize}
        onFiltersChange={onFiltersChange}
        onPageChange={onPageChange}
        onSortChange={onSortChange}
        onFrontendSortChange={setClientSortColumn}
        availableFilterOptions={mergedFilterOptions}
        selectedVMs={selectedVMs}
        onSelectionChange={setSelectedVMs}
        onFetchAllVmIds={agentApi ? handleFetchAllVmIds : undefined}
        onRefreshFilterOptions={onRefreshFilterOptions}
        onRunDeepInspection={handleRunDeepInspection}
        onExcludeFromReports={handleExcludeFromReports}
        onIncludeInReports={handleIncludeInReports}
        onAddLabels={handleAddLabels}
        onEditLabels={handleEditLabels}
        onManageLabels={handleManageLabels}
        onCreateGroup={
          agentApi && variant === "overview" ? handleCreateGroup : undefined
        }
        onAddToGroup={
          agentApi && variant === "overview" ? handleAddToGroup : undefined
        }
        onRemoveFromGroup={agentApi ? handleRemoveFromGroup : undefined}
        variant={variant}
        inspectionActive={inspectionActive}
        inspectionContextVms={inspectionContextVms}
        selectionContextLoadFailed={selectionContextLoadFailed}
        cancelingInspectionVmIds={cancelingInspectionVmIds}
        onCancelInspection={handleCancelInspection}
        onResetInspection={handleResetInspection}
      />
      {agentApi && (
        <DeepInspectionModal
          isOpen={isInspectionModalOpen}
          onClose={() => setIsInspectionModalOpen(false)}
          selectedVMIds={Array.from(selectedVMs)}
          knownVmsForInspection={inspectionContextVms}
          agentApi={agentApi}
          onInspectionStarted={handleInspectionStarted}
          onInspectionQueueChanged={onRefreshVMs}
        />
      )}
      <AddLabelsModal
        isOpen={isAddLabelsModalOpen}
        onClose={() => setIsAddLabelsModalOpen(false)}
        onSubmit={handleSubmitLabels}
        selectedVMCount={addLabelsVMIds.length}
        existingLabels={availableLabels}
        currentVMLabels={currentVMLabels}
        selectedVMName={selectedVMName}
        mode={addLabelsMode}
      />
      {agentApi && (
        <>
          <ManageLabelsModal
            isOpen={isManageLabelsModalOpen}
            onClose={() => setIsManageLabelsModalOpen(false)}
            onLabelsChanged={refreshLabels}
            agentApi={agentApi}
          />
          <CreateGroupFromSelectionModal
            isOpen={isCreateGroupModalOpen}
            vmIds={groupActionVMIds}
            onClose={() => setIsCreateGroupModalOpen(false)}
            onCreated={handleGroupActionComplete}
          />
          <AddToGroupModal
            isOpen={isAddToGroupModalOpen}
            vmIds={groupActionVMIds}
            onClose={() => setIsAddToGroupModalOpen(false)}
            onUpdated={handleGroupActionComplete}
          />
          <RemoveFromGroupModal
            isOpen={isRemoveFromGroupModalOpen}
            vmIds={groupActionVMIds}
            vmNames={groupActionVmNames}
            fixedGroupId={groupContext?.id}
            fixedGroupName={groupContext?.name}
            groupNames={groupNamesForRemoval}
            onClose={() => setIsRemoveFromGroupModalOpen(false)}
            onUpdated={handleGroupActionComplete}
          />
        </>
      )}
    </>
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAgentApiBasePath } from "../agentApiConfig";
import { AddLabelsModal } from "./AddLabelsModal";
import { AddToGroupModal } from "./AddToGroupModal";
import { CreateGroupFromSelectionModal } from "./CreateGroupFromSelectionModal";
import { DeepInspectionModal } from "./DeepInspectionModal";
import { combineFilterExpressions } from "./groupFilters";
import { ManageLabelsModal } from "./ManageLabelsModal";
import { RemoveFromGroupModal } from "./RemoveFromGroupModal";
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import { filtersToByExpression, type VMFilters } from "./vmFilters";
import {
  buildVmGroupMembership,
  mergeVmGroupItems,
  type VmGroupMembershipData,
} from "./vmGroupMembership";
import { cancelVmInspectionWithRetry } from "./vmInspectionUtils";
import { fetchAllMatchingVmIds } from "./vmSelection";

async function updateVmMigrationExcluded(
  agentApi: DefaultApiInterface,
  vmIds: string[],
  migrationExcluded: boolean,
  onRefreshVMs?: () => void,
): Promise<void> {
  const results = await Promise.allSettled(
    vmIds.map((id) =>
      agentApi.updateVM({
        id,
        virtualMachineUpdateRequest: { migrationExcluded },
      }),
    ),
  );

  const failedIds: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      failedIds.push(vmIds[i]);
      console.error(`Error updating VM ${vmIds[i]}:`, result.reason);
    }
  }

  onRefreshVMs?.();

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
  };
  agentApi?: DefaultApiInterface;
  onRefreshVMs?: () => void;
  /** Reload group metadata/filter after add/remove (group detail page). */
  onGroupMembershipChanged?: () => void | Promise<void>;
  showExcludedVMs?: boolean;
  onShowExcludedVMsChange?: (show: boolean) => void;
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
  onGroupMembershipChanged,
  showExcludedVMs,
  onShowExcludedVMsChange,
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

  const vmsForTable = useMemo(
    () => mergeVmGroupItems(vms, vmGroupMembership),
    [vms, vmGroupMembership],
  );

  const visibleVms = useMemo(() => {
    if (showExcludedVMs !== false) {
      return vmsForTable;
    }
    return vmsForTable.filter((vm) => !vm.migrationExcluded);
  }, [showExcludedVMs, vmsForTable]);

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
    if (onGroupMembershipChanged) {
      await onGroupMembershipChanged();
      await loadVmGroupMembership();
      return;
    }
    await loadVmGroupMembership();
    onRefreshVMs?.();
  }, [loadVmGroupMembership, onGroupMembershipChanged, onRefreshVMs]);

  const handleFetchAllVmIds = useCallback(
    async (filters: VMFilters) => {
      if (!agentApi) {
        return [];
      }
      const effectiveFilters =
        showExcludedVMs === undefined
          ? filters
          : { ...filters, showExcludedVMs };
      const userExpression = filtersToByExpression(effectiveFilters);
      const byExpression = combineFilterExpressions(
        scopedFilterExpression,
        userExpression,
      );
      return fetchAllMatchingVmIds(agentApi, {
        byExpression,
        sort: sortFields.length > 0 ? sortFields : undefined,
      });
    },
    [agentApi, scopedFilterExpression, showExcludedVMs, sortFields],
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
    },
    [addLabelsVMIds, agentApi, refreshLabels],
  );

  const handleVMClick = (vmId: string) => {
    setSelectedVMId(vmId);
  };

  const handleBack = () => {
    setSelectedVMId(null);
    if (searchParams.has("vmId")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("vmId");
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleRunDeepInspection = (includeVmId?: string) => {
    const merged = new Set(selectedVMs);
    if (includeVmId) {
      merged.add(includeVmId);
    }
    // startInspection replaces the entire run on the server, so VMs that are
    // currently running or pending must be included in every new call or the
    // server will cancel them by omission.
    for (const vm of vms) {
      if (
        vm.inspectionStatus?.state === "running" ||
        vm.inspectionStatus?.state === "pending"
      ) {
        merged.add(vm.id);
      }
    }
    if (merged.size > 0) {
      setSelectedVMs(merged);
      setIsInspectionModalOpen(true);
    }
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
      await updateVmMigrationExcluded(agentApi, vmIds, true, onRefreshVMs);
    },
    [agentApi, onRefreshVMs],
  );

  const handleIncludeInReports = useCallback(
    async (vmIds: string[]) => {
      if (!agentApi) return;
      await updateVmMigrationExcluded(agentApi, vmIds, false, onRefreshVMs);
    },
    [agentApi, onRefreshVMs],
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
      />
    );
  }

  return (
    <>
      <VMTable
        vms={visibleVms}
        loading={loading}
        onVMClick={handleVMClick}
        initialFilters={initialFilters}
        totalVMs={totalVMs}
        currentPage={currentPage}
        pageSize={pageSize}
        onFiltersChange={onFiltersChange}
        onPageChange={onPageChange}
        onSortChange={onSortChange}
        availableFilterOptions={availableFilterOptions}
        selectedVMs={selectedVMs}
        onSelectionChange={setSelectedVMs}
        onFetchAllVmIds={agentApi ? handleFetchAllVmIds : undefined}
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
        showExcludedVMs={showExcludedVMs}
        onShowExcludedVMsChange={onShowExcludedVMsChange}
        inspectionActive={inspectionActive}
        cancelingInspectionVmIds={cancelingInspectionVmIds}
        onCancelInspection={handleCancelInspection}
        onResetInspection={handleResetInspection}
      />
      {agentApi && (
        <DeepInspectionModal
          isOpen={isInspectionModalOpen}
          onClose={() => setIsInspectionModalOpen(false)}
          selectedVMIds={Array.from(selectedVMs)}
          agentApi={agentApi}
          onInspectionStarted={handleInspectionStarted}
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
            onCreated={handleGroupsChanged}
          />
          <AddToGroupModal
            isOpen={isAddToGroupModalOpen}
            vmIds={groupActionVMIds}
            onClose={() => setIsAddToGroupModalOpen(false)}
            onUpdated={handleGroupsChanged}
          />
          <RemoveFromGroupModal
            isOpen={isRemoveFromGroupModalOpen}
            vmIds={groupActionVMIds}
            vmNames={groupActionVmNames}
            fixedGroupId={groupContext?.id}
            fixedGroupName={groupContext?.name}
            groupNames={groupNamesForRemoval}
            onClose={() => setIsRemoveFromGroupModalOpen(false)}
            onUpdated={handleGroupsChanged}
          />
        </>
      )}
    </>
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

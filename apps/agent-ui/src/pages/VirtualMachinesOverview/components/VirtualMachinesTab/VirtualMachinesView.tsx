import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { agentApiSlice } from "../../../../store/api/agentApiSlice";
import { groupChangeTags } from "../../../../store/api/groupTags";
import {
  useCancelVirtualMachineInspectionMutation,
  useStopInspectionMutation,
} from "../../../../store/api/lifecycleEndpoints";
import {
  useGetApplicationsQuery,
  useGetVMLabelsQuery,
  useSetVMExclusionMutation,
  useUpdateVMLabelsMutation,
} from "../../../../store/api/vmsEndpoints";
import { useAppDispatch } from "../../../../store/hooks";
import { AddLabelsModal } from "../../../Groups/components/modals/AddLabelsModal";
import { AddToGroupModal } from "../../../Groups/components/modals/AddToGroupModal";
import { CreateGroupFromSelectionModal } from "../../../Groups/components/modals/CreateGroupFromSelectionModal";
import { ManageLabelsModal } from "../../../Groups/components/modals/ManageLabelsModal";
import { RemoveFromGroupModal } from "../../../Groups/components/modals/RemoveFromGroupModal";
import { combineFilterExpressions } from "../../../Groups/utils/groupFilters";
import {
  buildVmGroupMembership,
  mergeVmGroupItems,
  type VmGroupMembershipData,
} from "../../../Groups/utils/vmGroupMembership";
import { buildVmDetailUrl } from "../../reportTabNavigation";
import type { VirtualMachineWithExclusion } from "../../virtualMachineParsing";
import { getVmTags } from "../../virtualMachineParsing";
import {
  buildVmApplicationsMap,
  mergeVmApplicationNames,
} from "../ApplicationsTab/applicationsApi";
import { DeepInspectionModal } from "./DeepInspectionModal";
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import { mergeGroupNamesIntoFilterOptions } from "./vmFilterOptions";
import {
  filtersToByExpression,
  type VMFilters,
  withDefaultReportInclusion,
} from "./vmFilters";
import { getDeepInspectionEnablement } from "./vmInspectionUtils";
import { fetchAllMatchingVmIds, fetchVmsByIds } from "./vmSelection";
import { vmTableStyles } from "./vmTableShared";

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
  /** When set, VMs are shown inside this group's detail page */
  groupContext?: { id: string; name: string };
  /** Base filter applied before table filters (e.g. group membership). */
  scopedFilterExpression?: string;
  sortFields?: string[];
}

/** Fallback VM shape when a selected id is not present in the current table. */
const EMPTY_VM: VirtualMachine = {
  id: "",
  name: "",
  vCenterID: "",
  vCenterState: "",
  cluster: "",
  datacenter: "",
  diskSize: 0,
  memory: 0,
  issueCount: 0,
  migratable: false,
};

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
  groupContext,
  scopedFilterExpression,
  sortFields = [],
}) => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = groupContext ? "groups" : "overview";
  const [selectedVMId, setSelectedVMId] = useState<string | null>(null);
  const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set());
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionActive, setInspectionActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const [stopInspection] = useStopInspectionMutation();
  const [cancelVmInspection] = useCancelVirtualMachineInspectionMutation();

  // --- Cache invalidation helpers ------------------------------------------
  // The VM list (and, for exclusion, the inventory) this view shows lives in
  // one cache entry, refetched by tag invalidation. Which tag depends on the
  // page: the group detail page reads GroupVms, the overview page reads Vms.
  const refreshVmList = useCallback(() => {
    dispatch(
      agentApiSlice.util.invalidateTags(
        groupContext
          ? [{ type: "GroupVms", id: groupContext.id }]
          : [{ type: "Vms", id: "LIST" }],
      ),
    );
  }, [dispatch, groupContext]);

  // A group membership change affects the groups dropdown (Group:LIST), the
  // group's own detail (when scoped), and the VM rows' group chips.
  const refreshAfterGroupChange = useCallback(() => {
    dispatch(
      agentApiSlice.util.invalidateTags(
        groupContext
          ? [{ type: "Group", id: "LIST" }, ...groupChangeTags(groupContext.id)]
          : [
              { type: "Group", id: "LIST" },
              { type: "Vms", id: "LIST" },
            ],
      ),
    );
  }, [dispatch, groupContext]);

  const refreshLabels = useCallback(() => {
    dispatch(agentApiSlice.util.invalidateTags(["VmLabels"]));
    refreshVmList();
  }, [dispatch, refreshVmList]);

  const [setVMExclusion] = useSetVMExclusionMutation();
  const [updateVMLabels] = useUpdateVMLabelsMutation();

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
  const { data: availableLabels = [] } = useGetVMLabelsQuery(undefined, {
    skip: !agentApi,
  });
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
  const [offPageSelectedVms, setOffPageSelectedVms] = useState<
    VirtualMachine[]
  >([]);
  const [offPageSelectionLoadFailed, setOffPageSelectionLoadFailed] =
    useState(false);

  // Application names per VM (for the table's Applications column) come from the
  // shared applications cache entry.
  const { data: applicationsData } = useGetApplicationsQuery(
    {},
    { skip: !agentApi },
  );
  const vmApplicationsMap = useMemo(
    () => buildVmApplicationsMap(applicationsData ?? []),
    [applicationsData],
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
    () =>
      mergeVmApplicationNames(
        mergeVmGroupItems(vms, vmGroupMembership),
        vmApplicationsMap,
      ),
    [vms, vmGroupMembership, vmApplicationsMap],
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

  const missingSelectedVmIdsKey = useMemo(
    () =>
      [...selectedVMs]
        .filter((id) => !visibleVmIds.has(id))
        .sort()
        .join(","),
    [selectedVMs, visibleVmIds],
  );

  useEffect(() => {
    if (!agentApi) {
      setOffPageSelectedVms([]);
      setOffPageSelectionLoadFailed(false);
      return;
    }

    const missingIds = missingSelectedVmIdsKey
      ? missingSelectedVmIdsKey.split(",")
      : [];
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
  }, [agentApi, missingSelectedVmIdsKey]);

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

  const currentVMLabels = useMemo(() => {
    if (addLabelsVMIds.length === 0) return [];
    const labelSet = new Set<string>();
    for (const vm of vmsForTable) {
      if (addLabelsVMIds.includes(vm.id)) {
        const vmLabels = getVmTags(vm);
        if (vmLabels) {
          for (const l of vmLabels) labelSet.add(l);
        }
      }
    }
    return [...labelSet].sort();
  }, [addLabelsVMIds, vmsForTable]);

  const selectedVMName = useMemo(() => {
    if (addLabelsVMIds.length !== 1) return undefined;
    const vm = vmsForTable.find((v) => v.id === addLabelsVMIds[0]);
    return vm?.name;
  }, [addLabelsVMIds, vmsForTable]);

  const handleAddLabels = useCallback((vmIds: string[]) => {
    setAddLabelsVMIds(vmIds);
    setAddLabelsMode("add");
    setIsAddLabelsModalOpen(true);
  }, []);

  const handleEditLabels = useCallback((vmIds: string[]) => {
    setAddLabelsVMIds(vmIds);
    setAddLabelsMode("edit");
    setIsAddLabelsModalOpen(true);
  }, []);

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
        .map((id) => vmsForTable.find((vm) => vm.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [groupActionVMIds, vmsForTable],
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
    refreshAfterGroupChange();
    await loadVmGroupMembership();
  }, [loadVmGroupMembership, refreshAfterGroupChange]);

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

  const handleSubmitLabels = useCallback(
    async (labelsToAdd: string[], labelsToRemove: string[]) => {
      if (!agentApi) {
        return;
      }
      const vmIds = addLabelsVMIds;

      await Promise.all([
        ...labelsToAdd.map((label) =>
          updateVMLabels({
            label,
            add: vmIds,
            groupId: groupContext?.id,
          }).unwrap(),
        ),
        ...labelsToRemove.map((label) =>
          updateVMLabels({
            label,
            remove: vmIds,
            groupId: groupContext?.id,
          }).unwrap(),
        ),
      ]);
      setSelectedVMs(new Set());
    },
    [addLabelsVMIds, agentApi, groupContext, updateVMLabels],
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

  const handleVMIssuesClick = (vmId: string) => {
    setSelectedVMId(vmId);
    setSearchParams(
      buildVmDetailUrl(searchParams, vmId, { section: "issues" }),
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
      refreshVmList();
    }, pollIntervalMs);

    return () => stopPolling();
  }, [shouldPoll, pollIntervalMs, stopPolling, refreshVmList]);

  const handleCancelInspection = useCallback(
    async (vmId: string) => {
      if (!agentApi) return;

      setCancelingInspectionVmIds((prev) => new Set(prev).add(vmId));
      try {
        await cancelVmInspection({ vmId }).unwrap();
        refreshVmList();
      } catch (err) {
        setCancelingInspectionVmIds((prev) => {
          const next = new Set(prev);
          next.delete(vmId);
          return next;
        });
        throw err;
      }
    },
    [agentApi, cancelVmInspection, refreshVmList],
  );

  const runExclusionChange = useCallback(
    async (vmIds: string[], migrationExcluded: boolean) => {
      if (!agentApi || vmIds.length === 0) return;
      // Pre-change exclusion state so the optimistic inventory adjustment stays
      // accurate even if the table has not refreshed from a prior operation.
      const affectedVms = vmIds.map((id) => {
        const vm = vmsForTable.find((candidate) => candidate.id === id);
        return {
          ...(vm ?? { ...EMPTY_VM, id, name: id }),
          migrationExcluded: !migrationExcluded,
        } as VirtualMachineWithExclusion;
      });
      await setVMExclusion({
        vmIds,
        migrationExcluded,
        affectedVms,
        groupId: groupContext?.id,
      }).unwrap();
    },
    [agentApi, groupContext, setVMExclusion, vmsForTable],
  );

  const handleExcludeFromReports = useCallback(
    (vmIds: string[]) => runExclusionChange(vmIds, true),
    [runExclusionChange],
  );

  const handleIncludeInReports = useCallback(
    (vmIds: string[]) => runExclusionChange(vmIds, false),
    [runExclusionChange],
  );

  const handleResetInspection = useCallback(async () => {
    if (!agentApi) return;
    try {
      await stopInspection().unwrap();
      setInspectionActive(false);
      refreshVmList();
    } catch (err) {
      console.error("Error stopping inspection for reset:", err);
    }
    setIsInspectionModalOpen(true);
  }, [agentApi, stopInspection, refreshVmList]);

  const handleInspectionStarted = useCallback(() => {
    seenRunningRef.current = false;
    pollTicksRef.current = 0;
    setInspectionActive(true);
    setSelectedVMs(new Set());
    refreshVmList();
  }, [refreshVmList]);

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

  return (
    <>
      {selectedVMId ? (
        <div className={vmTableStyles.viewScroll}>
          <VMDetailsPage
            vmId={selectedVMId}
            onBack={handleBack}
            scrollToSection={vmSectionParam}
            onScrollToSectionComplete={handleScrollToSectionComplete}
          />
        </div>
      ) : (
        <div className={vmTableStyles.viewFill}>
          <VMTable
            vms={visibleVms}
            loading={loading}
            onVMClick={handleVMClick}
            onVMApplicationsClick={handleVMApplicationsClick}
            onVMIssuesClick={handleVMIssuesClick}
            initialFilters={initialFilters}
            totalVMs={totalVMs}
            currentPage={currentPage}
            pageSize={pageSize}
            onFiltersChange={onFiltersChange}
            onPageChange={onPageChange}
            onSortChange={onSortChange}
            availableFilterOptions={mergedFilterOptions}
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
            inspectionActive={inspectionActive}
            inspectionContextVms={inspectionContextVms}
            selectionContextLoadFailed={selectionContextLoadFailed}
            cancelingInspectionVmIds={cancelingInspectionVmIds}
            onCancelInspection={handleCancelInspection}
            onResetInspection={handleResetInspection}
          />
        </div>
      )}
      {agentApi && (
        <DeepInspectionModal
          isOpen={isInspectionModalOpen}
          onClose={() => setIsInspectionModalOpen(false)}
          selectedVMIds={Array.from(selectedVMs)}
          knownVmsForInspection={inspectionContextVms}
          agentApi={agentApi}
          onInspectionStarted={handleInspectionStarted}
          onInspectionQueueChanged={refreshVmList}
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

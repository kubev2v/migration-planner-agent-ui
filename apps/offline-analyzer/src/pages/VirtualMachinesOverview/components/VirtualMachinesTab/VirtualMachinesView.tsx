import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { agentApiSlice } from "../../../../store/api/agentApiSlice";
import { groupChangeTags } from "../../../../store/api/groupTags";
import {
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
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import { mergeGroupNamesIntoFilterOptions } from "./vmFilterOptions";
import {
  filtersToByExpression,
  type VMFilters,
  withDefaultReportInclusion,
} from "./vmFilters";
import { fetchAllMatchingVmIds } from "./vmSelection";

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

  if (selectedVMId) {
    return (
      <VMDetailsPage
        vmId={selectedVMId}
        onBack={handleBack}
        scrollToSection={vmSectionParam}
        onScrollToSectionComplete={handleScrollToSectionComplete}
      />
    );
  }

  return (
    <>
      <VMTable
        vms={visibleVms}
        loading={loading}
        onVMClick={handleVMClick}
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
      />
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

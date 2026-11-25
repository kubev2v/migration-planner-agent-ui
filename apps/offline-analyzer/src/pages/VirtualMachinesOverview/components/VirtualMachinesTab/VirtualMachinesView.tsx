import type { VirtualMachine } from "@openshift-migration-advisor/offline-analyzer-sdk";
import { Alert, Button } from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { agentApiSlice } from "../../../../store/api/agentApiSlice";
import { useGetVmGroupMembershipQuery } from "../../../../store/api/groupsEndpoints";
import {
  useGetVMLabelsQuery,
  useSetVMExclusionMutation,
  useUpdateVMLabelsMutation,
} from "../../../../store/api/vmsEndpoints";
import { getSdkErrorMessage } from "../../../../store/baseQuery";
import { useAppDispatch } from "../../../../store/hooks";
import { AddToGroupModal } from "../../../Groups/components/modals/AddToGroupModal";
import { CreateGroupFromSelectionModal } from "../../../Groups/components/modals/CreateGroupFromSelectionModal";
import { RemoveFromGroupModal } from "../../../Groups/components/modals/RemoveFromGroupModal";
import { mergeVmGroupItems } from "../../../Groups/utils/vmGroupMembership";
import { buildVmDetailUrl } from "../../reportTabNavigation";
import type { VirtualMachineWithExclusion } from "../../virtualMachineParsing";
import { getVmTags } from "../../virtualMachineParsing";
import { AddLabelsModal } from "../LabelModals/AddLabelsModal";
import { ManageLabelsModal } from "../LabelModals/ManageLabelsModal";
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import {
  combineFilterExpressions,
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
    vsphereTags: string[];
  };
  agentApi?: DefaultApiInterface;
  /** When set, table actions are scoped to this group's report. */
  groupContext?: { id: string; name: string };
  /** Base filter applied before table filters (e.g. cluster scope). */
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
  // one cache entry, refetched by tag invalidation.
  const refreshVmList = useCallback(() => {
    dispatch(
      agentApiSlice.util.invalidateTags(
        groupContext
          ? [{ type: "GroupVms", id: groupContext.id }]
          : [{ type: "Vms", id: "LIST" }],
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
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [createGroupVMIds, setCreateGroupVMIds] = useState<string[]>([]);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
  const [addToGroupVMIds, setAddToGroupVMIds] = useState<string[]>([]);
  const [isRemoveFromGroupModalOpen, setIsRemoveFromGroupModalOpen] =
    useState(false);
  const [removeFromGroupVMIds, setRemoveFromGroupVMIds] = useState<string[]>(
    [],
  );
  const { data: availableLabels = [] } = useGetVMLabelsQuery(undefined, {
    skip: !agentApi,
  });

  const {
    data: vmGroupMembership,
    error: vmGroupMembershipError,
    isFetching: isFetchingVmGroupMembership,
    refetch: refetchVmGroupMembership,
  } = useGetVmGroupMembershipQuery(undefined, { skip: !agentApi });
  const vmsForTable = useMemo(
    () => (vmGroupMembership ? mergeVmGroupItems(vms, vmGroupMembership) : vms),
    [vms, vmGroupMembership],
  );
  const visibleVms = vmsForTable;
  const selectedGroupIds = useMemo(() => {
    const groupIds = new Set<string>();
    for (const vmId of selectedVMs) {
      for (const group of vmGroupMembership?.[vmId] ?? []) {
        groupIds.add(group.id);
      }
    }
    return [...groupIds];
  }, [selectedVMs, vmGroupMembership]);

  const groupIdsForRemoval = useMemo(() => {
    const groupIds = new Set<string>();
    for (const vmId of removeFromGroupVMIds) {
      for (const group of vmGroupMembership?.[vmId] ?? []) {
        groupIds.add(group.id);
      }
    }
    return [...groupIds];
  }, [removeFromGroupVMIds, vmGroupMembership]);

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

  const handleCreateGroup = useCallback((vmIds: string[]) => {
    setCreateGroupVMIds(vmIds);
    setIsCreateGroupModalOpen(true);
  }, []);

  const handleAddToGroup = useCallback((vmIds: string[]) => {
    setAddToGroupVMIds(vmIds);
    setIsAddToGroupModalOpen(true);
  }, []);

  const handleRemoveFromGroup = useCallback((vmIds: string[]) => {
    setRemoveFromGroupVMIds(vmIds);
    setIsRemoveFromGroupModalOpen(true);
  }, []);

  const handleGroupActionComplete = useCallback(() => {
    setSelectedVMs(new Set());
  }, []);

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
      {vmGroupMembershipError && (
        <Alert
          variant="danger"
          title="Failed to load VM group membership"
          isInline
        >
          {getSdkErrorMessage(
            vmGroupMembershipError,
            "Failed to load VM group membership.",
          )}{" "}
          <Button
            variant="link"
            onClick={() => void refetchVmGroupMembership()}
            isDisabled={isFetchingVmGroupMembership}
          >
            Retry
          </Button>
        </Alert>
      )}
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
        availableFilterOptions={availableFilterOptions}
        selectedVMs={selectedVMs}
        onSelectionChange={setSelectedVMs}
        onFetchAllVmIds={agentApi ? handleFetchAllVmIds : undefined}
        onExcludeFromReports={handleExcludeFromReports}
        onIncludeInReports={handleIncludeInReports}
        onAddLabels={handleAddLabels}
        onEditLabels={handleEditLabels}
        onManageLabels={handleManageLabels}
        onCreateGroup={
          agentApi && !groupContext ? handleCreateGroup : undefined
        }
        onAddToGroup={agentApi && !groupContext ? handleAddToGroup : undefined}
        canRemoveFromGroup={
          groupContext ? selectedVMs.size > 0 : selectedGroupIds.length > 0
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
        <ManageLabelsModal
          isOpen={isManageLabelsModalOpen}
          onClose={() => setIsManageLabelsModalOpen(false)}
          onLabelsChanged={refreshLabels}
          agentApi={agentApi}
        />
      )}
      <CreateGroupFromSelectionModal
        isOpen={isCreateGroupModalOpen}
        vmIds={createGroupVMIds}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreated={() => setSelectedVMs(new Set())}
      />
      <AddToGroupModal
        isOpen={isAddToGroupModalOpen}
        vmIds={addToGroupVMIds}
        onClose={() => setIsAddToGroupModalOpen(false)}
        onUpdated={handleGroupActionComplete}
      />
      <RemoveFromGroupModal
        isOpen={isRemoveFromGroupModalOpen}
        vmIds={removeFromGroupVMIds}
        groupIds={groupIdsForRemoval}
        fixedGroupId={groupContext?.id}
        fixedGroupName={groupContext?.name}
        onClose={() => setIsRemoveFromGroupModalOpen(false)}
        onUpdated={handleGroupActionComplete}
      />
    </>
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DefaultApiInterface } from "../../../../api/agentApi";
import { agentApiSlice } from "../../../../store/api/agentApiSlice";
import {
  useGetVMLabelsQuery,
  useSetVMExclusionMutation,
  useUpdateVMLabelsMutation,
} from "../../../../store/api/vmsEndpoints";
import { useAppDispatch } from "../../../../store/hooks";
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
  };
  agentApi?: DefaultApiInterface;
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
  scopedFilterExpression,
  sortFields = [],
}) => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedVMId, setSelectedVMId] = useState<string | null>(null);
  const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set());

  // --- Cache invalidation helpers ------------------------------------------
  // The VM list (and, for exclusion, the inventory) this view shows lives in
  // one cache entry, refetched by tag invalidation.
  const refreshVmList = useCallback(() => {
    dispatch(agentApiSlice.util.invalidateTags([{ type: "Vms", id: "LIST" }]));
  }, [dispatch]);

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

  const vmsForTable = vms;
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
          }).unwrap(),
        ),
        ...labelsToRemove.map((label) =>
          updateVMLabels({
            label,
            remove: vmIds,
          }).unwrap(),
        ),
      ]);
      setSelectedVMs(new Set());
    },
    [addLabelsVMIds, agentApi, updateVMLabels],
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
      }).unwrap();
    },
    [agentApi, setVMExclusion, vmsForTable],
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
        availableFilterOptions={availableFilterOptions}
        selectedVMs={selectedVMs}
        onSelectionChange={setSelectedVMs}
        onFetchAllVmIds={agentApi ? handleFetchAllVmIds : undefined}
        onExcludeFromReports={handleExcludeFromReports}
        onIncludeInReports={handleIncludeInReports}
        onAddLabels={handleAddLabels}
        onEditLabels={handleEditLabels}
        onManageLabels={handleManageLabels}
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
    </>
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

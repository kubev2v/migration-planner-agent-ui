import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeepInspectionModal } from "./DeepInspectionModal";
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import type { VMFilters } from "./vmFilters";

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
  };
  agentApi?: DefaultApiInterface;
  onRefreshVMs?: () => void;
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
}) => {
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
  const MAX_POLL_TICKS = 60; // 60 × 5 s = 5 min

  useEffect(() => {
    onRefreshVMsRef.current = onRefreshVMs;
  }, [onRefreshVMs]);

  // Once any VM has inspection data the column must stay visible, even while
  // the list is momentarily empty during a sort/filter refetch.
  const hasInspectionResultsRef = useRef(false);
  if (vms.some((vm) => vm.inspectionStatus != null)) {
    hasInspectionResultsRef.current = true;
  }
  const hasInspectionResults = hasInspectionResultsRef.current;

  const handleVMClick = (vmId: string) => {
    setSelectedVMId(vmId);
  };

  const handleBack = () => {
    setSelectedVMId(null);
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

  const handleCancelInspection = useCallback(async () => {
    if (!agentApi) return;
    try {
      await agentApi.stopInspection();
      stopPolling();
      setInspectionActive(false);
      onRefreshVMs?.();
    } catch (err) {
      console.error("Error canceling inspection:", err);
    }
  }, [agentApi, onRefreshVMs, stopPolling]);

  const handleResetInspection = useCallback(async () => {
    if (!agentApi) return;
    try {
      await agentApi.stopInspection();
      stopPolling();
      setInspectionActive(false);
      onRefreshVMs?.();
    } catch (err) {
      console.error("Error stopping inspection for reset:", err);
    }
    setIsInspectionModalOpen(true);
  }, [agentApi, onRefreshVMs, stopPolling]);

  const handleInspectionStarted = useCallback(() => {
    seenRunningRef.current = false;
    pollTicksRef.current = 0;
    setInspectionActive(true);
    setSelectedVMs(new Set());
    onRefreshVMsRef.current?.();

    stopPolling();
    pollingRef.current = setInterval(() => {
      pollTicksRef.current += 1;
      onRefreshVMsRef.current?.();
    }, 5000);
  }, [stopPolling]);

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
      stopPolling();
      setInspectionActive(false);
    }
  }, [vms, inspectionActive, stopPolling]);

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
        vms={vms}
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
        onRunDeepInspection={handleRunDeepInspection}
        hasInspectionResults={hasInspectionResults || inspectionActive}
        inspectionActive={inspectionActive}
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
    </>
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

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

  const hasInspectionResults = vms.some((vm) => vm.inspectionStatus != null);

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

  const handleResetInspection = () => {
    setIsInspectionModalOpen(true);
  };

  const handleInspectionStarted = useCallback(() => {
    setInspectionActive(true);
    setSelectedVMs(new Set());
    onRefreshVMs?.();

    stopPolling();
    pollingRef.current = setInterval(() => {
      onRefreshVMs?.();
    }, 5000);
  }, [onRefreshVMs, stopPolling]);

  useEffect(() => {
    if (!inspectionActive) return;

    const allDone = vms.every((vm) => {
      if (!vm.inspectionStatus) return true;
      const s = vm.inspectionStatus.state;
      return s === "completed" || s === "error" || s === "canceled";
    });

    if (allDone && vms.some((vm) => vm.inspectionStatus != null)) {
      stopPolling();
      setInspectionActive(false);
    }
  }, [vms, inspectionActive, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  if (selectedVMId) {
    return <VMDetailsPage vmId={selectedVMId} onBack={handleBack} />;
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

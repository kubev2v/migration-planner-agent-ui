import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useState } from "react";
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
}) => {
  const [selectedVMId, setSelectedVMId] = useState<string | null>(null);

  const handleVMClick = (vmId: string) => {
    setSelectedVMId(vmId);
  };

  const handleBack = () => {
    setSelectedVMId(null);
  };

  if (selectedVMId) {
    return <VMDetailsPage vmId={selectedVMId} onBack={handleBack} />;
  }

  return (
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
    />
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

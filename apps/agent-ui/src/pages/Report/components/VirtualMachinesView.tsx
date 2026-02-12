import type { VM } from "@migration-planner-ui/agent-client/models";
import type React from "react";
import { useState } from "react";
import { VMDetailsPage } from "./VMDetailsPage";
import { VMTable } from "./VMTable";
import type { VMFilters } from "./vmFilters";

interface VirtualMachinesViewProps {
  vms: VM[];
  loading?: boolean;
  initialFilters?: VMFilters;
}

export const VirtualMachinesView: React.FC<VirtualMachinesViewProps> = ({
  vms,
  loading = false,
  initialFilters,
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
    />
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

import type { VM } from "@migration-planner-ui/agent-client/models";
import type React from "react";
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
  return (
    <VMTable vms={vms} loading={loading} initialFilters={initialFilters} />
  );
};

VirtualMachinesView.displayName = "VirtualMachinesView";

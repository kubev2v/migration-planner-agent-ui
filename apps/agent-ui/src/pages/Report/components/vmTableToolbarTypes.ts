import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type { VMTableVariantUI } from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";

export interface VMTableToolbarProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  loading: boolean;
  vms: VirtualMachine[];
  totalVMs?: number;
  selectedVMs: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onFetchAllVmIds?: (
    filters: import("./vmFilters").VMFilters,
  ) => Promise<string[]>;
  showExcludedVMs: boolean;
  onShowExcludedVMsChange?: (show: boolean) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  hasInspectionResults: boolean;
  inspectionActive: boolean;
  isGroupRowActions: boolean;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onAddLabels?: (vmIds: string[]) => void;
  onManageLabels?: () => void;
  onCreateGroup?: (vmIds: string[]) => void;
  onAddToGroup?: (vmIds: string[]) => void;
  onRemoveFromGroup?: (vmIds: string[]) => void;
  onRunDeepInspection?: (includeVmId?: string) => void;
  onResetInspection?: () => void;
}

import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type { ThProps } from "@patternfly/react-table";
import type { VMFilters } from "./vmFilters";
import type { ColumnKey, VMTableVariant } from "./vmTableShared";

export interface VMTableFilterOptions {
  clusters: string[];
  datacenters: string[];
  concernLabels: string[];
  concernCategories: string[];
  vmLabels: string[];
}

export interface VMTableProps {
  vms: VirtualMachine[];
  loading: boolean;
  initialFilters?: VMFilters;
  onVMClick?: (vmId: string) => void;
  totalVMs?: number;
  currentPage?: number;
  pageSize?: number;
  onFiltersChange?: (filters: VMFilters) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sortFields: string[]) => void;
  availableFilterOptions?: VMTableFilterOptions;
  selectedVMs?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onFetchAllVmIds?: (filters: VMFilters) => Promise<string[]>;
  onRunDeepInspection?: (includeVmId?: string) => void;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onAddLabels?: (vmIds: string[]) => void;
  onEditLabels?: (vmIds: string[]) => void;
  onManageLabels?: () => void;
  onCreateGroup?: (vmIds: string[]) => void;
  onAddToGroup?: (vmIds: string[]) => void;
  onRemoveFromGroup?: (vmIds: string[]) => void;
  showExcludedVMs?: boolean;
  onShowExcludedVMsChange?: (show: boolean) => void;
  inspectionActive?: boolean;
  cancelingInspectionVmIds?: Set<string>;
  onCancelInspection?: (vmId: string) => Promise<void>;
  onResetInspection?: () => void;
  variant?: VMTableVariant;
}

export type VMTableColumnDef = {
  key: ColumnKey;
  label: string;
  sortable: boolean;
};

export type UseVMTableLogicParams = Pick<
  VMTableProps,
  | "vms"
  | "initialFilters"
  | "totalVMs"
  | "currentPage"
  | "pageSize"
  | "onFiltersChange"
  | "onPageChange"
  | "onSortChange"
  | "availableFilterOptions"
  | "selectedVMs"
  | "onSelectionChange"
  | "onFetchAllVmIds"
  | "showExcludedVMs"
  | "variant"
>;

export type VMTableLogic = ReturnType<
  typeof import("./useVMTableLogic").useVMTableLogic
>;

export type GetSortParams = (
  columnKey: ColumnKey,
  columnIndex: number,
) => ThProps["sort"];

import type React from "react";
import { useVMTableLogic } from "./useVMTableLogic";
import { VMTableGrid } from "./VMTableGrid";
import { VMTableModals } from "./VMTableModals";
import { VMTableToolbar } from "./VMTableToolbar";
import { vmTableStyles } from "./vmTableShared";
import type { VMTableProps } from "./vmTableTypes";
import { VM_TABLE_VARIANT_UI } from "./vmTableVariants";

export type { VMTableProps } from "./vmTableTypes";

export const VMTable: React.FC<VMTableProps> = ({
  vms,
  loading,
  initialFilters,
  onVMClick,
  totalVMs,
  currentPage = 1,
  pageSize = 20,
  onFiltersChange,
  onPageChange,
  onSortChange,
  availableFilterOptions,
  selectedVMs = new Set<string>(),
  onSelectionChange,
  onFetchAllVmIds,
  onRunDeepInspection,
  onExcludeFromReports,
  onIncludeInReports,
  onAddLabels,
  onEditLabels,
  onManageLabels,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  showExcludedVMs = true,
  onShowExcludedVMsChange,
  hasInspectionResults = false,
  inspectionActive = false,
  onCancelInspection,
  onResetInspection,
  variant = "overview",
  showGroupsColumn = false,
  rowActionsVariant = "overview",
}) => {
  const variantUI = VM_TABLE_VARIANT_UI[variant];
  const isGroupRowActions = rowActionsVariant === "group";

  const logic = useVMTableLogic({
    vms,
    initialFilters,
    totalVMs,
    currentPage,
    pageSize,
    onFiltersChange,
    onPageChange,
    onSortChange,
    availableFilterOptions,
    selectedVMs,
    onSelectionChange,
    onFetchAllVmIds,
    showExcludedVMs,
    hasInspectionResults,
    variant,
    showGroupsColumn,
    rowActionsVariant,
  });

  return (
    <div className={vmTableStyles.vmTable}>
      <VMTableToolbar
        logic={logic}
        variantUI={variantUI}
        loading={loading}
        vms={vms}
        totalVMs={totalVMs}
        selectedVMs={selectedVMs}
        onSelectionChange={onSelectionChange}
        onFetchAllVmIds={onFetchAllVmIds}
        showExcludedVMs={showExcludedVMs}
        onShowExcludedVMsChange={onShowExcludedVMsChange}
        onPageChange={onPageChange}
        hasInspectionResults={hasInspectionResults}
        inspectionActive={inspectionActive}
        isGroupRowActions={isGroupRowActions}
        onExcludeFromReports={onExcludeFromReports}
        onIncludeInReports={onIncludeInReports}
        onAddLabels={onAddLabels}
        onManageLabels={onManageLabels}
        onCreateGroup={onCreateGroup}
        onAddToGroup={onAddToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
        onRunDeepInspection={onRunDeepInspection}
        onResetInspection={onResetInspection}
      />

      <VMTableGrid
        logic={logic}
        variantUI={variantUI}
        loading={loading}
        vms={vms}
        selectedVMs={selectedVMs}
        hasInspectionResults={hasInspectionResults}
        isGroupRowActions={isGroupRowActions}
        onVMClick={onVMClick}
        onRunDeepInspection={onRunDeepInspection}
        onExcludeFromReports={onExcludeFromReports}
        onIncludeInReports={onIncludeInReports}
        onEditLabels={onEditLabels}
        onAddToGroup={onAddToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
        openCancelInspectionConfirm={logic.openCancelInspectionConfirm}
      />

      <VMTableModals
        logic={logic}
        onCancelInspection={onCancelInspection}
        onExcludeFromReports={onExcludeFromReports}
        onIncludeInReports={onIncludeInReports}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
};

VMTable.displayName = "VMTable";

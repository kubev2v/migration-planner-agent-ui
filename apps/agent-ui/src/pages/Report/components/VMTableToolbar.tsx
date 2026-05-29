import { Toolbar } from "@patternfly/react-core";
import type React from "react";
import { VMTableActionBar } from "./VMTableActionBar";
import { VMTableFilterBar } from "./VMTableFilterBar";
import type { VMTableToolbarProps } from "./vmTableToolbarTypes";

export type { VMTableToolbarProps } from "./vmTableToolbarTypes";

export const VMTableToolbar: React.FC<VMTableToolbarProps> = (props) => {
  const {
    logic,
    variantUI,
    loading,
    vms,
    totalVMs,
    selectedVMs,
    onSelectionChange,
    onFetchAllVmIds,
    showExcludedVMs,
    onShowExcludedVMsChange,
    onPageChange,
    hasInspectionResults,
    inspectionActive,
    isGroupRowActions,
    onExcludeFromReports,
    onIncludeInReports,
    onAddLabels,
    onManageLabels,
    onCreateGroup,
    onAddToGroup,
    onRemoveFromGroup,
    onRunDeepInspection,
    onResetInspection,
  } = props;

  return (
    <Toolbar>
      <VMTableFilterBar
        logic={logic}
        variantUI={variantUI}
        hasInspectionResults={hasInspectionResults}
        selectedVMs={selectedVMs}
        onSelectionChange={onSelectionChange}
        onFetchAllVmIds={onFetchAllVmIds}
      />
      <VMTableActionBar
        logic={logic}
        variantUI={variantUI}
        loading={loading}
        vms={vms}
        totalVMs={totalVMs}
        selectedVMs={selectedVMs}
        showExcludedVMs={showExcludedVMs}
        onShowExcludedVMsChange={onShowExcludedVMsChange}
        onPageChange={onPageChange}
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
    </Toolbar>
  );
};

VMTableToolbar.displayName = "VMTableToolbar";

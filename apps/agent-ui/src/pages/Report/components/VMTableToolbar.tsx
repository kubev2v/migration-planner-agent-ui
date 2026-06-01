import { Toolbar, ToolbarContent } from "@patternfly/react-core";
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

  const filterBarProps = {
    logic,
    variantUI,
    hasInspectionResults,
    selectedVMs,
    onSelectionChange,
    onFetchAllVmIds,
  };

  const actionBarProps = {
    logic,
    variantUI,
    loading,
    vms,
    totalVMs,
    selectedVMs,
    showExcludedVMs,
    onShowExcludedVMsChange,
    onPageChange,
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
  };

  return (
    <Toolbar>
      <ToolbarContent>
        <VMTableFilterBar {...filterBarProps} part="main" />
        <VMTableActionBar {...actionBarProps} />
      </ToolbarContent>
      <VMTableFilterBar {...filterBarProps} part="applied" />
    </Toolbar>
  );
};

VMTableToolbar.displayName = "VMTableToolbar";

import { Toolbar, ToolbarContent } from "@patternfly/react-core";
import type React from "react";
import { attributeValueFilterToolbarStyle } from "../../../../common/components/attribute-value-filter";
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
    <Toolbar
      className={attributeValueFilterToolbarStyle}
      clearAllFilters={logic.clearAllFilters}
    >
      <ToolbarContent>
        <VMTableFilterBar {...filterBarProps} />
        <VMTableActionBar {...actionBarProps} />
      </ToolbarContent>
    </Toolbar>
  );
};

VMTableToolbar.displayName = "VMTableToolbar";

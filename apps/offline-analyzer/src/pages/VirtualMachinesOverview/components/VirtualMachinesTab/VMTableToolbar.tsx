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
    onPageChange,
    onExcludeFromReports,
    onIncludeInReports,
    onAddLabels,
    onManageLabels,
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
    onPageChange,
    onExcludeFromReports,
    onIncludeInReports,
    onAddLabels,
    onManageLabels,
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

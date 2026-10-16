import { css } from "@emotion/css";
import type React from "react";
import { useVMTableLogic } from "./useVMTableLogic";
import { VMTableGrid } from "./VMTableGrid";
import { VMTableModals } from "./VMTableModals";
import { VMTableToolbar } from "./VMTableToolbar";
import { resolveVariantUI } from "./vmTableShared";
import type { VMTableProps } from "./vmTableTypes";

export type { VMTableProps } from "./vmTableTypes";

const vmTableContainerStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const vmTableContainerCompactStyle = css`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const gridScrollContainerStyle = css`
  flex-grow: 1;
  overflow: auto;
  min-height: 0;
  flex-basis: 0;
`;

const gridScrollContainerCompactStyle = css`
  overflow: auto;
  min-height: 0;
  max-height: 50vh;
`;

export const VMTable: React.FC<VMTableProps> = ({
  vms,
  loading,
  initialFilters,
  onVMClick,
  onVMIssuesClick,
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
  onExcludeFromReports,
  onIncludeInReports,
  onAddLabels,
  onEditLabels,
  onManageLabels,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  variant = "overview",
}) => {
  const variantUI = resolveVariantUI({ variant, totalVMs });
  const isGroupRowActions = variant === "groups";
  const isCompact = variant === "compact";

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
    variant,
  });

  return (
    <div
      className={
        isCompact ? vmTableContainerCompactStyle : vmTableContainerStyle
      }
    >
      <VMTableToolbar
        logic={logic}
        variantUI={variantUI}
        loading={loading}
        vms={vms}
        totalVMs={totalVMs}
        selectedVMs={selectedVMs}
        onSelectionChange={onSelectionChange}
        onFetchAllVmIds={onFetchAllVmIds}
        onPageChange={onPageChange}
        isGroupRowActions={isGroupRowActions}
        onExcludeFromReports={onExcludeFromReports}
        onIncludeInReports={onIncludeInReports}
        onAddLabels={onAddLabels}
        onManageLabels={onManageLabels}
        onCreateGroup={onCreateGroup}
        onAddToGroup={onAddToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
      />
      <div
        className={
          isCompact ? gridScrollContainerCompactStyle : gridScrollContainerStyle
        }
      >
        <VMTableGrid
          logic={logic}
          variantUI={variantUI}
          loading={loading}
          vms={vms}
          selectedVMs={selectedVMs}
          isGroupRowActions={isGroupRowActions}
          onVMClick={onVMClick}
          onVMIssuesClick={onVMIssuesClick}
          onExcludeFromReports={onExcludeFromReports}
          onIncludeInReports={onIncludeInReports}
          onEditLabels={onEditLabels}
          onAddToGroup={onAddToGroup}
          onRemoveFromGroup={onRemoveFromGroup}
        />
      </div>
      <VMTableModals
        logic={logic}
        onExcludeFromReports={onExcludeFromReports}
        onIncludeInReports={onIncludeInReports}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
};

VMTable.displayName = "VMTable";

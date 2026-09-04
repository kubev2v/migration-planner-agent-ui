import { Stack, StackItem } from "@patternfly/react-core";
import { InnerScrollContainer } from "@patternfly/react-table";
import type React from "react";
import { useVMTableLogic } from "./useVMTableLogic";
import { VMTableGrid } from "./VMTableGrid";
import { VMTableModals } from "./VMTableModals";
import { VMTableToolbar } from "./VMTableToolbar";
import { resolveVariantUI, vmTableStyles } from "./vmTableShared";
import type { VMTableProps } from "./vmTableTypes";

export type { VMTableProps } from "./vmTableTypes";

export const VMTable: React.FC<VMTableProps> = ({
  vms,
  loading,
  initialFilters,
  onVMClick,
  onVMApplicationsClick,
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
  onRunDeepInspection,
  onExcludeFromReports,
  onIncludeInReports,
  onAddLabels,
  onEditLabels,
  onManageLabels,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  inspectionActive = false,
  inspectionContextVms,
  selectionContextLoadFailed,
  cancelingInspectionVmIds,
  onCancelInspection,
  onResetInspection,
  variant = "overview",
}) => {
  const variantUI = resolveVariantUI({ variant, totalVMs });
  const isGroupRowActions = variant === "groups";
  const fillRemainingHeight = variant !== "compact";

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

  const grid = (
    <VMTableGrid
      logic={logic}
      variantUI={variantUI}
      loading={loading}
      vms={vms}
      selectedVMs={selectedVMs}
      isGroupRowActions={isGroupRowActions}
      onVMClick={onVMClick}
      onVMApplicationsClick={onVMApplicationsClick}
      onVMIssuesClick={onVMIssuesClick}
      onRunDeepInspection={onRunDeepInspection}
      onExcludeFromReports={onExcludeFromReports}
      onIncludeInReports={onIncludeInReports}
      onEditLabels={onEditLabels}
      onAddToGroup={onAddToGroup}
      onRemoveFromGroup={onRemoveFromGroup}
      openCancelInspectionConfirm={logic.openCancelInspectionConfirm}
      cancelingInspectionVmIds={cancelingInspectionVmIds}
      inspectionContextVms={inspectionContextVms}
      selectionContextLoadFailed={selectionContextLoadFailed}
    />
  );

  return (
    <>
      <Stack className={vmTableStyles.vmTable}>
        <StackItem>
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
            inspectionContextVms={inspectionContextVms}
            selectionContextLoadFailed={selectionContextLoadFailed}
          />
        </StackItem>

        {fillRemainingHeight ? (
          <StackItem isFilled className={vmTableStyles.gridFill}>
            <InnerScrollContainer className={vmTableStyles.gridInnerScroll}>
              <div className={vmTableStyles.gridTableWrap}>{grid}</div>
            </InnerScrollContainer>
          </StackItem>
        ) : (
          <StackItem>{grid}</StackItem>
        )}
      </Stack>
      <VMTableModals
        logic={logic}
        cancelingInspectionVmIds={cancelingInspectionVmIds}
        onCancelInspection={onCancelInspection}
        onExcludeFromReports={onExcludeFromReports}
        onIncludeInReports={onIncludeInReports}
        onSelectionChange={onSelectionChange}
      />
    </>
  );
};

VMTable.displayName = "VMTable";

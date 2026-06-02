import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  Spinner,
  Tooltip,
} from "@patternfly/react-core";
import { EllipsisVIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { formatMetric } from "./VMUtilizationMetrics";
import {
  renderVmInspectionStatus,
  renderVmStatus,
} from "./vmTableCellRenderers";
import {
  formatDiskSize,
  formatMemorySize,
  getColumnModifier,
} from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";
import type { VMTableVariantUI } from "./vmTableVariants";

export interface VMTableGridProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  loading: boolean;
  vms: VirtualMachine[];
  selectedVMs: Set<string>;
  hasInspectionResults: boolean;
  isGroupRowActions: boolean;
  onVMClick?: (vmId: string) => void;
  onRunDeepInspection?: (includeVmId?: string) => void;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onEditLabels?: (vmIds: string[]) => void;
  onAddToGroup?: (vmIds: string[]) => void;
  onRemoveFromGroup?: (vmIds: string[]) => void;
  setIsCancelConfirmOpen: (open: boolean) => void;
}

export const VMTableGrid: React.FC<VMTableGridProps> = ({
  logic,
  variantUI,
  loading,
  vms,
  selectedVMs,
  hasInspectionResults,
  isGroupRowActions,
  onVMClick,
  onRunDeepInspection,
  onExcludeFromReports,
  onIncludeInReports,
  onEditLabels,
  onAddToGroup,
  onRemoveFromGroup,
  setIsCancelConfirmOpen,
}) => {
  const {
    columns,
    getSortParams,
    displayVMs,
    isColumnVisible,
    onSelectVM,
    openActionMenuId,
    setOpenActionMenuId,
  } = logic;

  const { hideToolbarActions, disableVmNavigation, groupsDisplay } = variantUI;

  return (
    <Table
      aria-label="Virtual machines table"
      variant="compact"
      borders={false}
      isStickyHeader
    >
      <Thead>
        <Tr>
          <Th screenReaderText="Select" />
          {columns.map((column, index) => (
            <Th
              key={column.key}
              sort={
                column.sortable ? getSortParams(column.key, index) : undefined
              }
              modifier={getColumnModifier(column.key)}
            >
              {column.label}
            </Th>
          ))}
          {!hideToolbarActions && (
            <Th modifier="fitContent" screenReaderText="Actions" />
          )}
        </Tr>
      </Thead>
      <Tbody>
        {loading && vms.length === 0 ? (
          <Tr>
            <Td colSpan={columns.length + (hideToolbarActions ? 1 : 2)}>
              <Flex
                alignItems={{ default: "alignItemsCenter" }}
                gap={{ default: "gapSm" }}
              >
                <Spinner size="md" />
                <span>Loading virtual machines...</span>
              </Flex>
            </Td>
          </Tr>
        ) : vms.length === 0 ? (
          <Tr>
            <Td colSpan={columns.length + (hideToolbarActions ? 1 : 2)}>
              No virtual machines found
            </Td>
          </Tr>
        ) : (
          displayVMs.map((vm, rowIndex) => (
            <Tr key={vm.id}>
              <Td
                select={{
                  rowIndex,
                  onSelect: (_event, isSelected) => onSelectVM(vm, isSelected),
                  isSelected:
                    selectedVMs.has(vm.id) ||
                    vm.inspectionStatus?.state === "running" ||
                    vm.inspectionStatus?.state === "pending",
                  isDisabled:
                    vm.inspectionStatus?.state === "running" ||
                    vm.inspectionStatus?.state === "pending",
                }}
              />
              {isColumnVisible("name") && (
                <Td dataLabel="Name" modifier="truncate">
                  {onVMClick && !disableVmNavigation ? (
                    <Tooltip content={vm.name}>
                      <Button
                        variant="link"
                        isInline
                        onClick={() => onVMClick(vm.id)}
                      >
                        {vm.name}
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip content={vm.name}>
                      <span>{vm.name}</span>
                    </Tooltip>
                  )}
                  {vm.migrationExcluded && (
                    <div style={{ marginTop: "4px" }}>
                      <Label isCompact color="grey">
                        Excluded
                      </Label>
                    </div>
                  )}
                </Td>
              )}
              {isColumnVisible("labels") && (
                <Td dataLabel="Labels">
                  {(() => {
                    const vmLabels: string[] | undefined = (
                      vm as VirtualMachine & { labels?: string[] }
                    ).labels;
                    if (vmLabels && vmLabels.length > 0) {
                      return (
                        <LabelGroup numLabels={5}>
                          {vmLabels.map((lbl: string) => (
                            <Label key={lbl} isCompact>
                              {lbl}
                            </Label>
                          ))}
                        </LabelGroup>
                      );
                    }
                    return "–";
                  })()}
                </Td>
              )}
              {isColumnVisible("groups") && (
                <Td dataLabel="Groups">
                  {vm.groups && vm.groups.length > 0 ? (
                    groupsDisplay === "text" ? (
                      vm.groups.join(", ")
                    ) : (
                      <LabelGroup numLabels={3}>
                        {vm.groups.map((groupName) => (
                          <Label key={groupName} isCompact>
                            {groupName}
                          </Label>
                        ))}
                      </LabelGroup>
                    )
                  ) : (
                    "–"
                  )}
                </Td>
              )}
              {isColumnVisible("vCenterState") && (
                <Td dataLabel="Status">{renderVmStatus(vm)}</Td>
              )}
              {isColumnVisible("migratable") && (
                <Td dataLabel="Migration Readiness" modifier="fitContent">
                  {vm.migratable === true
                    ? "Ready"
                    : vm.migratable === false
                      ? "Not ready"
                      : "Unknown"}
                </Td>
              )}
              {isColumnVisible("id") && <Td dataLabel="ID">{vm.id}</Td>}

              {isColumnVisible("maxCPU") && (
                <Td dataLabel="Max CPU" modifier="fitContent">
                  {formatMetric(vm.utilization_cpu_max)}
                </Td>
              )}
              {isColumnVisible("maxRAM") && (
                <Td dataLabel="Max RAM" modifier="fitContent">
                  {formatMetric(vm.utilization_mem_max)}
                </Td>
              )}
              {isColumnVisible("diskUsage") && (
                <Td dataLabel="Disk usage" modifier="fitContent">
                  {formatMetric(vm.utilization_disk)}
                </Td>
              )}
              {isColumnVisible("datacenter") && (
                <Td dataLabel="Data center">{vm.datacenter || "—"}</Td>
              )}
              {isColumnVisible("cluster") && (
                <Td dataLabel="Cluster">{vm.cluster || "—"}</Td>
              )}
              {isColumnVisible("diskSize") && (
                <Td dataLabel="Disk size">
                  {formatDiskSize(vm.diskSize || 0)}
                </Td>
              )}
              {isColumnVisible("memory") && (
                <Td dataLabel="Memory size">
                  {formatMemorySize(vm.memory || 0)}
                </Td>
              )}
              {isColumnVisible("issues") && (
                <Td dataLabel="Issues" modifier="fitContent">
                  {vm.issueCount || 0}
                </Td>
              )}
              {hasInspectionResults && isColumnVisible("deepInspection") && (
                <Td dataLabel="Deep inspection">
                  {renderVmInspectionStatus(vm, onVMClick)}
                </Td>
              )}
              {!hideToolbarActions && (
                <Td isActionCell modifier="fitContent">
                  <Dropdown
                    isOpen={openActionMenuId === vm.id}
                    onSelect={(_event, value) => {
                      setOpenActionMenuId(null);
                      if (value === "remove-from-group") {
                        onRemoveFromGroup?.([vm.id]);
                      }
                    }}
                    onOpenChange={(isOpen) =>
                      setOpenActionMenuId(isOpen ? vm.id : null)
                    }
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        variant="plain"
                        onClick={() =>
                          setOpenActionMenuId(
                            openActionMenuId === vm.id ? null : vm.id,
                          )
                        }
                        isExpanded={openActionMenuId === vm.id}
                      >
                        <EllipsisVIcon />
                      </MenuToggle>
                    )}
                    popperProps={{ position: "right" }}
                  >
                    <DropdownList>
                      {isGroupRowActions && (
                        <DropdownItem
                          key="remove-from-group"
                          value="remove-from-group"
                          isDisabled={!onRemoveFromGroup}
                        >
                          Remove from group
                        </DropdownItem>
                      )}
                      {(() => {
                        const vmState = vm.inspectionStatus?.state;
                        if (vmState === "running" || vmState === "pending") {
                          return (
                            <DropdownItem
                              key="cancel-vm-inspection"
                              onClick={() => setIsCancelConfirmOpen(true)}
                            >
                              Cancel deep inspection
                            </DropdownItem>
                          );
                        }
                        if (
                          vmState === "completed" ||
                          vmState === "error" ||
                          vmState === "canceled"
                        ) {
                          return (
                            <DropdownItem
                              key="rerun-inspection"
                              onClick={() => onRunDeepInspection?.(vm.id)}
                            >
                              Re-run deep inspection
                            </DropdownItem>
                          );
                        }
                        return (
                          <DropdownItem
                            key="inspect"
                            onClick={() => onRunDeepInspection?.(vm.id)}
                          >
                            Run deep inspection
                          </DropdownItem>
                        );
                      })()}
                      {vm.migrationExcluded ? (
                        <DropdownItem
                          key="include-in-reports"
                          onClick={() => onIncludeInReports?.([vm.id])}
                        >
                          Include in reports
                        </DropdownItem>
                      ) : (
                        <DropdownItem
                          key="exclude-from-reports"
                          onClick={() => onExcludeFromReports?.([vm.id])}
                        >
                          Exclude from reports
                        </DropdownItem>
                      )}
                      <DropdownItem
                        key="edit-labels"
                        onClick={() => onEditLabels?.([vm.id])}
                      >
                        Edit labels
                      </DropdownItem>
                      {!isGroupRowActions && onAddToGroup && (
                        <DropdownItem
                          key="add-to-group"
                          value="add-to-group"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            onAddToGroup([vm.id]);
                          }}
                        >
                          Add to group
                        </DropdownItem>
                      )}
                      <DropdownItem
                        key="details"
                        onClick={() => onVMClick?.(vm.id)}
                      >
                        View details
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </Td>
              )}
            </Tr>
          ))
        )}
      </Tbody>
    </Table>
  );
};

VMTableGrid.displayName = "VMTableGrid";

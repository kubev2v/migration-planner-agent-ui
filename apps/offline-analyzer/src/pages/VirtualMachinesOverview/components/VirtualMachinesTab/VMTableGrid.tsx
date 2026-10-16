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
import { EllipsisVIcon, SearchIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { AppEmptyState } from "../../../../common/components";
import { getMigrationExcluded, getVmTags } from "../../virtualMachineParsing";
import { formatMetric } from "./VMUtilizationMetrics";
import { renderVmStatus } from "./vmTableCellRenderers";
import {
  formatDiskSize,
  formatMemorySize,
  getColumnModifier,
  type VMTableVariantUI,
} from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";

type VirtualMachineListUtilization = VirtualMachine & {
  utilization_cpu_max?: number;
  utilization_mem_max?: number;
  utilization_disk?: number;
};

const getListVmUtilization = (
  vm: VirtualMachine,
  field: keyof Pick<
    VirtualMachineListUtilization,
    "utilization_cpu_max" | "utilization_mem_max" | "utilization_disk"
  >,
): number | undefined => (vm as VirtualMachineListUtilization)[field];

export interface VMTableGridProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  loading: boolean;
  vms: VirtualMachine[];
  selectedVMs: Set<string>;
  onVMClick?: (vmId: string) => void;
  onVMIssuesClick?: (vmId: string) => void;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onEditLabels?: (vmIds: string[]) => void;
}

export const VMTableGrid: React.FC<VMTableGridProps> = ({
  logic,
  variantUI,
  loading,
  vms,
  selectedVMs,
  onVMClick,
  onVMIssuesClick,
  onExcludeFromReports,
  onIncludeInReports,
  onEditLabels,
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

  const { hideToolbarActions, disableVmNavigation } = variantUI;

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
              <AppEmptyState
                titleText="No virtual machines found"
                body="Try adjusting your filters or search criteria."
                icon={SearchIcon}
              />
            </Td>
          </Tr>
        ) : (
          displayVMs.map((vm, rowIndex) => {
            return (
              <Tr key={vm.id}>
                <Td
                  select={{
                    rowIndex,
                    onSelect: (_event, isSelected) =>
                      onSelectVM(vm, isSelected),
                    isSelected: selectedVMs.has(vm.id),
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
                    {getMigrationExcluded(vm) && (
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
                      const vmLabels = getVmTags(vm);
                      if (vmLabels.length > 0) {
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

                {isColumnVisible("cpuUsage") && (
                  <Td dataLabel="CPU usage" modifier="fitContent">
                    {formatMetric(
                      getListVmUtilization(vm, "utilization_cpu_max"),
                    )}
                  </Td>
                )}
                {isColumnVisible("ramUsage") && (
                  <Td dataLabel="RAM usage" modifier="fitContent">
                    {formatMetric(
                      getListVmUtilization(vm, "utilization_mem_max"),
                    )}
                  </Td>
                )}
                {isColumnVisible("diskUsage") && (
                  <Td dataLabel="Disk usage" modifier="fitContent">
                    {formatMetric(getListVmUtilization(vm, "utilization_disk"))}
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
                    {(vm.issueCount || 0) > 0 &&
                    onVMIssuesClick &&
                    !disableVmNavigation ? (
                      <Button
                        variant="link"
                        isInline
                        onClick={() => onVMIssuesClick(vm.id)}
                      >
                        {vm.issueCount}
                      </Button>
                    ) : (
                      vm.issueCount || 0
                    )}
                  </Td>
                )}
                {!hideToolbarActions && (
                  <Td isActionCell modifier="fitContent">
                    <Dropdown
                      isOpen={openActionMenuId === vm.id}
                      onSelect={() => {
                        setOpenActionMenuId(null);
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
                        {getMigrationExcluded(vm) ? (
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
            );
          })
        )}
      </Tbody>
    </Table>
  );
};

VMTableGrid.displayName = "VMTableGrid";

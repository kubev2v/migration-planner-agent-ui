import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import {
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from "@patternfly/react-core";
import { ColumnsIcon } from "@patternfly/react-icons/dist/esm/icons/columns-icon";
import type React from "react";
import { AttributeValueFilter } from "../../../../common/components/attribute-value-filter";
import {
  DEEP_INSPECTION_BUSY_TOOLTIP,
  isDeepInspectionInProgress,
} from "./vmInspectionUtils";
import {
  type ColumnKey,
  Columns,
  MANDATORY_COLUMNS,
  type VMTableVariantUI,
} from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";

export interface VMTableFilterBarProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  vms: VirtualMachine[];
  inspectionActive: boolean;
  selectedVMs: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onFetchAllVmIds?: (
    filters: import("./vmFilters").VMFilters,
  ) => Promise<string[]>;
}

export const VMTableFilterBar: React.FC<VMTableFilterBarProps> = ({
  logic,
  variantUI,
  vms,
  inspectionActive,
  selectedVMs,
  onSelectionChange,
  onFetchAllVmIds,
}) => {
  const {
    pageVmIds,
    allPageSelected,
    totalMatchingCount,
    handleSelectAllMatching,
    isBulkSelectOpen,
    setIsBulkSelectOpen,
    isSelectingAll,
    filterAttributes,
    isColumnSelectOpen,
    setIsColumnSelectOpen,
    isColumnVisible,
    toggleColumn,
  } = logic;

  const { showManageColumns, defaultColumnsKeys } = variantUI;
  const inspectionInProgress = isDeepInspectionInProgress(
    inspectionActive,
    vms,
  );

  const bulkSelectDropdown = (
    <Dropdown
      isOpen={isBulkSelectOpen}
      onOpenChange={(isOpen) => {
        if (!inspectionInProgress) {
          setIsBulkSelectOpen(isOpen);
        }
      }}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => {
            if (!inspectionInProgress) {
              setIsBulkSelectOpen(!isBulkSelectOpen);
            }
          }}
          variant="default"
          isDisabled={inspectionInProgress}
          splitButtonItems={[
            <Checkbox
              key="select-page"
              id="select-page-vms"
              isChecked={
                allPageSelected ? true : selectedVMs.size > 0 ? null : false
              }
              isDisabled={inspectionInProgress}
              onChange={(_event, checked) => {
                if (inspectionInProgress) return;
                if (checked) {
                  onSelectionChange?.(new Set(pageVmIds));
                } else {
                  onSelectionChange?.(new Set());
                }
              }}
              aria-label="Select VMs on this page"
            />,
          ]}
        />
      )}
    >
      <DropdownList>
        <DropdownItem
          key="select-none"
          isDisabled={inspectionInProgress}
          onClick={() => {
            if (inspectionInProgress) return;
            onSelectionChange?.(new Set());
            setIsBulkSelectOpen(false);
          }}
        >
          Select none (0 items)
        </DropdownItem>
        <DropdownItem
          key="select-page"
          isDisabled={inspectionInProgress}
          onClick={() => {
            if (inspectionInProgress) return;
            onSelectionChange?.(new Set(pageVmIds));
            setIsBulkSelectOpen(false);
          }}
        >
          Select page ({pageVmIds.length} items)
        </DropdownItem>
        <DropdownItem
          key="select-all"
          isDisabled={
            inspectionInProgress || !onFetchAllVmIds || isSelectingAll
          }
          onClick={() => {
            if (inspectionInProgress) return;
            void handleSelectAllMatching();
          }}
        >
          {isSelectingAll
            ? "Selecting all..."
            : `Select all (${totalMatchingCount} items)`}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );

  return (
    <>
      {onSelectionChange && (
        <ToolbarItem>
          {inspectionInProgress ? (
            <Tooltip content={DEEP_INSPECTION_BUSY_TOOLTIP}>
              <span>{bulkSelectDropdown}</span>
            </Tooltip>
          ) : (
            bulkSelectDropdown
          )}
        </ToolbarItem>
      )}

      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <AttributeValueFilter
            attributes={filterAttributes}
            defaultActiveAttributeId="name"
          />
        </ToolbarItem>

        {showManageColumns && (
          <ToolbarItem>
            <Select
              role="menu"
              isOpen={isColumnSelectOpen}
              onSelect={(_event, selection) => {
                toggleColumn(selection as ColumnKey);
              }}
              onOpenChange={setIsColumnSelectOpen}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsColumnSelectOpen((prev) => !prev)}
                  isExpanded={isColumnSelectOpen}
                >
                  <ColumnsIcon /> Manage columns
                </MenuToggle>
              )}
            >
              <SelectList>
                {defaultColumnsKeys.map((key) => (
                  <SelectOption
                    key={key}
                    value={key}
                    hasCheckbox
                    isSelected={isColumnVisible(key)}
                    isDisabled={MANDATORY_COLUMNS.includes(key)}
                  >
                    {Columns[key]}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarItem>
        )}
      </ToolbarGroup>
    </>
  );
};

VMTableFilterBar.displayName = "VMTableFilterBar";

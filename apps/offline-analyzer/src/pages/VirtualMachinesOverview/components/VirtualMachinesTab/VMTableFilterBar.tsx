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
} from "@patternfly/react-core";
import { ColumnsIcon } from "@patternfly/react-icons/dist/esm/icons/columns-icon";
import type React from "react";
import { AttributeValueFilter } from "../../../../common/components/attribute-value-filter";
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
  selectedVMs: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onFetchAllVmIds?: (
    filters: import("./vmFilters").VMFilters,
  ) => Promise<string[]>;
}

export const VMTableFilterBar: React.FC<VMTableFilterBarProps> = ({
  logic,
  variantUI,
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

  return (
    <>
      {onSelectionChange && (
        <ToolbarItem>
          <Dropdown
            isOpen={isBulkSelectOpen}
            onOpenChange={setIsBulkSelectOpen}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsBulkSelectOpen(!isBulkSelectOpen)}
                variant="default"
                splitButtonItems={[
                  <Checkbox
                    key="select-page"
                    id="select-page-vms"
                    isChecked={
                      allPageSelected
                        ? true
                        : selectedVMs.size > 0
                          ? null
                          : false
                    }
                    onChange={(_event, checked) => {
                      if (checked) {
                        onSelectionChange(new Set(pageVmIds));
                      } else {
                        onSelectionChange(new Set());
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
                onClick={() => {
                  onSelectionChange(new Set());
                  setIsBulkSelectOpen(false);
                }}
              >
                Select none (0 items)
              </DropdownItem>
              <DropdownItem
                key="select-page"
                onClick={() => {
                  onSelectionChange(new Set(pageVmIds));
                  setIsBulkSelectOpen(false);
                }}
              >
                Select page ({pageVmIds.length} items)
              </DropdownItem>
              <DropdownItem
                key="select-all"
                isDisabled={!onFetchAllVmIds || isSelectingAll}
                onClick={() => {
                  void handleSelectAllMatching();
                }}
              >
                {isSelectingAll
                  ? "Selecting all..."
                  : `Select all (${totalMatchingCount} items)`}
              </DropdownItem>
            </DropdownList>
          </Dropdown>
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

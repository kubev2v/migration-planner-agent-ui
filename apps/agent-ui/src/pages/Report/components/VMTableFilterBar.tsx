import {
  Button,
  Checkbox,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  LabelGroup,
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";
import { FilterIcon } from "@patternfly/react-icons";
import { ColumnsIcon } from "@patternfly/react-icons/dist/esm/icons/columns-icon";
import type React from "react";
import { useRef } from "react";
import {
  type ColumnKey,
  Columns,
  diskSizeRanges,
  FILTER_DROPDOWN_MAX_HEIGHT,
  filterStyles,
  MANDATORY_COLUMNS,
  memorySizeRanges,
  statusLabels,
  type VMTableVariantUI,
} from "./vmTableShared";
import type { VMTableLogic } from "./vmTableTypes";

export interface VMTableFilterBarProps {
  logic: VMTableLogic;
  variantUI: VMTableVariantUI;
  hasInspectionResults: boolean;
  selectedVMs: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onFetchAllVmIds?: (
    filters: import("./vmFilters").VMFilters,
  ) => Promise<string[]>;
  /** "main" = filter controls for the primary toolbar row; "applied" = active filter chips row */
  part?: "main" | "applied";
}

export const VMTableFilterBar: React.FC<VMTableFilterBarProps> = ({
  logic,
  variantUI,
  hasInspectionResults,
  selectedVMs,
  onSelectionChange,
  onFetchAllVmIds,
  part = "main",
}) => {
  const {
    pageVmIds,
    allPageSelected,
    totalMatchingCount,
    handleSelectAllMatching,
    isBulkSelectOpen,
    setIsBulkSelectOpen,
    isSelectingAll,
    searchValue,
    handleSearchChange,
    handleSearchClear,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isConcernSelectOpen,
    setIsConcernSelectOpen,
    isVmLabelSelectOpen,
    setIsVmLabelSelectOpen,
    applyFilters,
    cancelFilterModal,
    tempSelectedConcernCategories,
    tempSelectedConcernLabels,
    tempSelectedDatacenters,
    tempSelectedClusters,
    tempDiskRangeFilter,
    tempMemoryRangeFilter,
    tempSelectedStatuses,
    tempSelectedMigrationReadiness,
    tempSelectedVmLabels,
    setTempHasIssuesFilter,
    setTempNoIssuesFilter,
    toggleTempConcernCategory,
    toggleTempConcernLabel,
    toggleTempDatacenter,
    toggleTempCluster,
    toggleTempDiskRange,
    toggleTempMemoryRange,
    toggleTempStatus,
    toggleTempMigrationReadiness,
    toggleTempVmLabel,
    appliedFilters,
    removeFilter,
    clearAllFilters,
    isColumnSelectOpen,
    setIsColumnSelectOpen,
    isColumnVisible,
    toggleColumn,
    availableConcernCategories,
    availableConcernLabels,
    availableDatacenters,
    availableClusters,
    availableVmLabels,
  } = logic;

  const { showManageColumns, defaultColumnsKeys } = variantUI;
  const isCompactTable = !showManageColumns;

  const handleFilterDropdownOpenChange = (open: boolean) => {
    if (!open && (isConcernSelectOpen || isVmLabelSelectOpen)) {
      return;
    }
    setIsFilterModalOpen(open);
  };

  const filterDropdownContentRef = useRef<HTMLDivElement>(null);
  const nestedSelectPopperProps = {
    appendTo: () => filterDropdownContentRef.current ?? document.body,
  };

  if (part === "applied") {
    if (appliedFilters.length === 0) {
      return null;
    }

    return (
      <ToolbarContent alignItems="center">
        <ToolbarItem>
          <LabelGroup categoryName="Filters">
            {appliedFilters.map((filter) => (
              <Label key={filter.key} onClose={() => removeFilter(filter.key)}>
                {filter.label}
              </Label>
            ))}
          </LabelGroup>
        </ToolbarItem>
        <ToolbarItem>
          <span>
            {appliedFilters.length} filter
            {appliedFilters.length !== 1 ? "s" : ""} applied
          </span>
        </ToolbarItem>
        <ToolbarItem>
          <Button variant="link" onClick={clearAllFilters}>
            Clear all filters
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    );
  }

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
          <SearchInput
            placeholder="Find by VM name"
            value={searchValue}
            onChange={handleSearchChange}
            onClear={handleSearchClear}
          />
        </ToolbarItem>

        {/* Filters Dropdown */}
        <ToolbarItem>
          <Dropdown
            isOpen={isFilterModalOpen}
            onOpenChange={handleFilterDropdownOpenChange}
            isScrollable
            maxMenuHeight={FILTER_DROPDOWN_MAX_HEIGHT}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                isExpanded={isFilterModalOpen}
                variant="default"
              >
                <FilterIcon /> Filters
              </MenuToggle>
            )}
            popperProps={{
              maxWidth: "95vw",
              appendTo: () => document.body,
            }}
          >
            <div
              className={
                isCompactTable
                  ? filterStyles.dropdownContentCompact
                  : filterStyles.dropdownContent
              }
            >
              <div
                className={
                  isCompactTable
                    ? filterStyles.filtersContentCompact
                    : filterStyles.filtersContent
                }
              >
                {/* Issue categories column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>
                    Issue categories:
                  </h3>
                  <div className={filterStyles.checkboxList}>
                    {availableConcernCategories.length > 0 &&
                      availableConcernCategories.map((category) => (
                        <Checkbox
                          key={category}
                          id={`concern-category-${category}`}
                          label={category}
                          isChecked={tempSelectedConcernCategories.includes(
                            category,
                          )}
                          onChange={() => {
                            toggleTempConcernCategory(category);
                            // Clear has/no issues filters when selecting specific categories
                            setTempHasIssuesFilter(false);
                            setTempNoIssuesFilter(false);
                          }}
                        />
                      ))}
                  </div>
                </div>

                {/* Specific issues column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Specific issues</h3>
                  <div className={filterStyles.checkboxList}>
                    {availableConcernLabels.length > 0 && (
                      <Select
                        isOpen={isConcernSelectOpen}
                        selected={tempSelectedConcernLabels}
                        popperProps={nestedSelectPopperProps}
                        onSelect={(_event, selection) => {
                          const concernLabel = selection as string;
                          toggleTempConcernLabel(concernLabel);
                          // Clear has/no issues filters when selecting specific concerns
                          setTempHasIssuesFilter(false);
                          setTempNoIssuesFilter(false);
                        }}
                        onOpenChange={(isOpen) => {
                          setIsConcernSelectOpen(isOpen);
                        }}
                        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() =>
                              setIsConcernSelectOpen(!isConcernSelectOpen)
                            }
                            isExpanded={isConcernSelectOpen}
                            className={filterStyles.concernSelect}
                          >
                            {tempSelectedConcernLabels.length === 0
                              ? "Select specific issues..."
                              : `${tempSelectedConcernLabels.length} selected`}
                          </MenuToggle>
                        )}
                        isScrollable
                      >
                        <SelectList>
                          {availableConcernLabels.map((concernLabel) => (
                            <SelectOption
                              key={concernLabel}
                              value={concernLabel}
                              hasCheckbox
                              isSelected={tempSelectedConcernLabels.includes(
                                concernLabel,
                              )}
                            >
                              {concernLabel}
                            </SelectOption>
                          ))}
                        </SelectList>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Data center column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Data center</h3>
                  <div className={filterStyles.checkboxList}>
                    {availableDatacenters.map((datacenter) => (
                      <Checkbox
                        key={datacenter}
                        id={`datacenter-${datacenter}`}
                        label={datacenter}
                        isChecked={tempSelectedDatacenters.includes(datacenter)}
                        onChange={() => toggleTempDatacenter(datacenter)}
                      />
                    ))}
                  </div>
                </div>

                {/* Cluster column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Cluster</h3>
                  <div className={filterStyles.checkboxList}>
                    {availableClusters.map((cluster) => (
                      <Checkbox
                        key={cluster}
                        id={`cluster-${cluster}`}
                        label={cluster}
                        isChecked={tempSelectedClusters.includes(cluster)}
                        onChange={() => toggleTempCluster(cluster)}
                      />
                    ))}
                  </div>
                </div>

                {/* Disk size column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Disk size</h3>
                  <div className={filterStyles.checkboxList}>
                    {diskSizeRanges.map((range, index) => (
                      <Checkbox
                        key={range.label}
                        id={`disk-${index}`}
                        label={range.label}
                        isChecked={
                          tempDiskRangeFilter?.min === range.min &&
                          tempDiskRangeFilter?.max === range.max
                        }
                        onChange={() => toggleTempDiskRange(index)}
                      />
                    ))}
                  </div>
                </div>

                {/* Memory size column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Memory size</h3>
                  <div className={filterStyles.checkboxList}>
                    {memorySizeRanges.map((range, index) => (
                      <Checkbox
                        key={range.label}
                        id={`memory-${index}`}
                        label={range.label}
                        isChecked={
                          tempMemoryRangeFilter?.min === range.min &&
                          tempMemoryRangeFilter?.max === range.max
                        }
                        onChange={() => toggleTempMemoryRange(index)}
                      />
                    ))}
                  </div>
                </div>

                {/* Status column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Status</h3>
                  <div className={filterStyles.checkboxList}>
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <Checkbox
                        key={status}
                        id={`status-${status}`}
                        label={label}
                        isChecked={tempSelectedStatuses.includes(status)}
                        onChange={() => toggleTempStatus(status)}
                      />
                    ))}
                  </div>
                </div>

                {/* Migration Readiness column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>
                    Migration Readiness
                  </h3>
                  <div className={filterStyles.checkboxList}>
                    <Checkbox
                      id="migration-ready"
                      label="Ready"
                      isChecked={tempSelectedMigrationReadiness.includes(
                        "ready",
                      )}
                      onChange={() => toggleTempMigrationReadiness("ready")}
                    />
                    <Checkbox
                      id="migration-not-ready"
                      label="Not ready"
                      isChecked={tempSelectedMigrationReadiness.includes(
                        "not-ready",
                      )}
                      onChange={() => toggleTempMigrationReadiness("not-ready")}
                    />
                  </div>
                </div>

                {/* VM labels column */}
                <div>
                  <h3 className={filterStyles.columnTitle}>Labels</h3>
                  <div className={filterStyles.checkboxList}>
                    {availableVmLabels.length > 0 ? (
                      <Select
                        isOpen={isVmLabelSelectOpen}
                        selected={tempSelectedVmLabels}
                        popperProps={nestedSelectPopperProps}
                        onSelect={(_event, selection) => {
                          toggleTempVmLabel(selection as string);
                        }}
                        onOpenChange={setIsVmLabelSelectOpen}
                        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() =>
                              setIsVmLabelSelectOpen(!isVmLabelSelectOpen)
                            }
                            isExpanded={isVmLabelSelectOpen}
                            className={filterStyles.concernSelect}
                          >
                            {tempSelectedVmLabels.length === 0
                              ? "Select labels..."
                              : `${tempSelectedVmLabels.length} selected`}
                          </MenuToggle>
                        )}
                        isScrollable
                      >
                        <SelectList>
                          {availableVmLabels.map((label) => (
                            <SelectOption
                              key={label}
                              value={label}
                              hasCheckbox
                              isSelected={tempSelectedVmLabels.includes(label)}
                            >
                              {label}
                            </SelectOption>
                          ))}
                        </SelectList>
                      </Select>
                    ) : (
                      <Content component="small">No labels available</Content>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer with buttons */}
              <div className={filterStyles.footer}>
                <Button variant="primary" onClick={applyFilters}>
                  Apply filters
                </Button>
                <Button variant="link" onClick={cancelFilterModal}>
                  Cancel
                </Button>
              </div>
            </div>
          </Dropdown>
        </ToolbarItem>

        {/* Manage Columns */}
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
                {defaultColumnsKeys
                  .filter(
                    (key) => key !== "deepInspection" || hasInspectionResults,
                  )
                  .map((key) => (
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

import { describe, expect, it, vi } from "vitest";
import { buildVmTableFilterAttributes } from "./vmTableFilterAttributes";
import { diskSizeRanges } from "./vmTableShared";

function createParams(
  overrides: Partial<Parameters<typeof buildVmTableFilterAttributes>[0]> = {},
) {
  return {
    searchValue: "",
    onSearchChange: vi.fn(),
    selectedConcernCategories: [],
    onConcernCategoriesChange: vi.fn(),
    selectedConcernLabels: [],
    onConcernLabelsChange: vi.fn(),
    selectedDatacenters: [],
    onDatacentersChange: vi.fn(),
    selectedClusters: [],
    onClustersChange: vi.fn(),
    diskRangeFilter: null,
    onDiskRangeChange: vi.fn(),
    memoryRangeFilter: null,
    onMemoryRangeChange: vi.fn(),
    cpuUsageRangeFilter: null,
    onCpuUsageRangeChange: vi.fn(),
    ramUsageRangeFilter: null,
    onRamUsageRangeChange: vi.fn(),
    diskUsageRangeFilter: null,
    onDiskUsageRangeChange: vi.fn(),
    selectedStatuses: [],
    onStatusesChange: vi.fn(),
    selectedMigrationReadiness: [],
    onMigrationReadinessChange: vi.fn(),
    selectedVmLabels: [],
    onVmLabelsChange: vi.fn(),
    selectedGroups: [],
    onGroupsChange: vi.fn(),
    hasIssuesFilter: false,
    noIssuesFilter: false,
    onIssuesFilterChange: vi.fn(),
    availableConcernCategories: ["Performance"],
    availableConcernLabels: ["High CPU"],
    availableDatacenters: ["dc-1"],
    availableClusters: ["cluster-a"],
    availableVmLabels: ["tier-1"],
    availableGroups: ["production"],
    showGroupsFilter: true,
    ...overrides,
  };
}

describe("buildVmTableFilterAttributes", () => {
  it("includes dynamic option attributes only when options exist", () => {
    const attributes = buildVmTableFilterAttributes(
      createParams({
        availableConcernCategories: [],
        availableConcernLabels: [],
        availableDatacenters: [],
        availableClusters: [],
        availableVmLabels: [],
        availableGroups: [],
      }),
    );

    expect(attributes.map((attribute) => attribute.id)).toEqual([
      "name",
      "issues",
      "disk-size",
      "memory-size",
      "cpu-usage",
      "ram-usage",
      "disk-usage",
      "status",
      "migration-readiness",
    ]);
  });

  it("applies single-select semantics for range filters", () => {
    const onDiskRangeChange = vi.fn();
    const attributes = buildVmTableFilterAttributes(
      createParams({ onDiskRangeChange }),
    );
    const diskSize = attributes.find(
      (attribute) => attribute.id === "disk-size",
    );
    expect(diskSize?.type).toBe("checkbox");

    if (!diskSize || diskSize.type !== "checkbox") {
      throw new Error("Expected disk-size checkbox attribute");
    }

    diskSize.onSelectionsChange(["1", "0"]);

    expect(onDiskRangeChange).toHaveBeenCalledWith({
      min: diskSizeRanges[1].min,
      max: diskSizeRanges[1].max,
    });
  });

  it("clears range filters when all selections are removed", () => {
    const onDiskRangeChange = vi.fn();
    const attributes = buildVmTableFilterAttributes(
      createParams({
        diskRangeFilter: {
          min: diskSizeRanges[0].min,
          max: diskSizeRanges[0].max,
        },
        onDiskRangeChange,
      }),
    );
    const diskSize = attributes.find(
      (attribute) => attribute.id === "disk-size",
    );

    if (!diskSize || diskSize.type !== "checkbox") {
      throw new Error("Expected disk-size checkbox attribute");
    }

    diskSize.onSelectionsChange([]);

    expect(onDiskRangeChange).toHaveBeenCalledWith(null);
  });

  it("wires onOpen to all checkbox attributes", () => {
    const onCheckboxValueOpen = vi.fn();
    const attributes = buildVmTableFilterAttributes(
      createParams({ onCheckboxValueOpen }),
    );

    const checkboxAttributes = attributes.filter(
      (attribute) => attribute.type === "checkbox",
    );
    expect(checkboxAttributes.length).toBeGreaterThan(0);
    for (const attribute of checkboxAttributes) {
      if (attribute.type === "checkbox") {
        attribute.onOpen?.();
      }
    }

    expect(onCheckboxValueOpen).toHaveBeenCalled();
  });

  it("omits groups when showGroupsFilter is false", () => {
    const attributes = buildVmTableFilterAttributes(
      createParams({ showGroupsFilter: false }),
    );

    expect(attributes.some((attribute) => attribute.id === "groups")).toBe(
      false,
    );
  });
});

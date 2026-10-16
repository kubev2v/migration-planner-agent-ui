import { describe, expect, it } from "vitest";
import {
  buildAppliedFilters,
  EMPTY_VM_TABLE_FILTER_SELECTION,
  removeFilterFromSelection,
} from "./vmTableFilterLogic";
import {
  diskSizeRanges,
  memorySizeRanges,
  utilizationPercentRanges,
} from "./vmTableShared";

describe("vmTableFilterLogic", () => {
  it("returns no chips for empty selection", () => {
    expect(buildAppliedFilters(EMPTY_VM_TABLE_FILTER_SELECTION)).toEqual([]);
  });

  it("builds chips for status, cluster, and label filters", () => {
    const chips = buildAppliedFilters({
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      selectedStatuses: ["poweredOn"],
      selectedClusters: ["prod-cluster"],
      selectedVmLabels: ["tier-1"],
    });

    expect(chips).toEqual([
      {
        category: "Status",
        label: "Powered on",
        key: "status-poweredOn",
      },
      {
        category: "Cluster",
        label: "prod-cluster",
        key: "cluster-prod-cluster",
      },
      {
        category: "Label",
        label: "tier-1",
        key: "vm-label-tier-1",
      },
    ]);
  });

  it("uses preset labels for memory and disk range filters", () => {
    const chips = buildAppliedFilters({
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      memoryRangeFilter: memorySizeRanges[0],
      diskRangeFilter: diskSizeRanges[1],
    });

    expect(chips).toEqual([
      {
        category: "Memory",
        label: "0-4 GB",
        key: "memorySize",
      },
      {
        category: "Disk size",
        label: "100-500GiB",
        key: "diskSize",
      },
    ]);
  });

  it("hides has/no issues chips when specific concerns are selected", () => {
    const chips = buildAppliedFilters({
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      hasIssuesFilter: true,
      noIssuesFilter: true,
      selectedConcernCategories: ["Storage"],
      selectedConcernLabels: ["Low disk space"],
    });

    expect(chips.map((chip) => chip.key)).toEqual([
      "concern-category-Storage",
      "concern-Low disk space",
    ]);
  });

  it("shows has issues chip only when no specific concerns are selected", () => {
    const chips = buildAppliedFilters({
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      hasIssuesFilter: true,
    });

    expect(chips).toEqual([
      {
        category: "Issues",
        label: "Has issues",
        key: "hasIssues",
      },
    ]);
  });

  it("removes a status chip without affecting other filters", () => {
    const selection = {
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      selectedStatuses: ["poweredOn", "poweredOff"],
      selectedClusters: ["prod-cluster"],
    };

    const next = removeFilterFromSelection(selection, "status-poweredOn");

    expect(next.selectedStatuses).toEqual(["poweredOff"]);
    expect(next.selectedClusters).toEqual(["prod-cluster"]);
    expect(buildAppliedFilters(next).map((chip) => chip.key)).toEqual([
      "status-poweredOff",
      "cluster-prod-cluster",
    ]);
  });

  it("removes concern category chips without matching concern label keys", () => {
    const selection = {
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      selectedConcernCategories: ["Storage"],
      selectedConcernLabels: ["Low disk space"],
    };

    const next = removeFilterFromSelection(
      selection,
      "concern-category-Storage",
    );

    expect(next.selectedConcernCategories).toEqual([]);
    expect(next.selectedConcernLabels).toEqual(["Low disk space"]);
  });

  it("clears range filters by chip key", () => {
    const selection = {
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      memoryRangeFilter: memorySizeRanges[0],
      diskRangeFilter: diskSizeRanges[0],
    };

    expect(
      removeFilterFromSelection(selection, "memorySize").memoryRangeFilter,
    ).toBeNull();
    expect(
      removeFilterFromSelection(selection, "diskSize").diskRangeFilter,
    ).toBeNull();
  });

  it("clears utilization range filters by chip key", () => {
    const selection = {
      ...EMPTY_VM_TABLE_FILTER_SELECTION,
      cpuUsageRangeFilter: utilizationPercentRanges[0],
      ramUsageRangeFilter: utilizationPercentRanges[1],
      diskUsageRangeFilter: utilizationPercentRanges[2],
    };

    expect(
      removeFilterFromSelection(selection, "cpuUsage").cpuUsageRangeFilter,
    ).toBeNull();
    expect(
      removeFilterFromSelection(selection, "ramUsage").ramUsageRangeFilter,
    ).toBeNull();
    expect(
      removeFilterFromSelection(selection, "diskUsage").diskUsageRangeFilter,
    ).toBeNull();
  });
});

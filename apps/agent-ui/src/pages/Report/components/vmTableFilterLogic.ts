import type { AppliedFilter } from "./vmTableShared";
import {
  diskSizeRanges,
  memorySizeRanges,
  statusLabels,
  utilizationPercentRanges,
} from "./vmTableShared";

export type RangeFilter = { min: number; max?: number };

export type VMTableFilterSelection = {
  selectedStatuses: string[];
  selectedClusters: string[];
  selectedDatacenters: string[];
  selectedMigrationReadiness: string[];
  selectedVmLabels: string[];
  selectedConcernLabels: string[];
  selectedConcernCategories: string[];
  hasIssuesFilter: boolean;
  noIssuesFilter: boolean;
  diskRangeFilter: RangeFilter | null;
  memoryRangeFilter: RangeFilter | null;
  cpuUsageRangeFilter: RangeFilter | null;
  ramUsageRangeFilter: RangeFilter | null;
  diskUsageRangeFilter: RangeFilter | null;
};

export const EMPTY_VM_TABLE_FILTER_SELECTION: VMTableFilterSelection = {
  selectedStatuses: [],
  selectedClusters: [],
  selectedDatacenters: [],
  selectedMigrationReadiness: [],
  selectedVmLabels: [],
  selectedConcernLabels: [],
  selectedConcernCategories: [],
  hasIssuesFilter: false,
  noIssuesFilter: false,
  diskRangeFilter: null,
  memoryRangeFilter: null,
  cpuUsageRangeFilter: null,
  ramUsageRangeFilter: null,
  diskUsageRangeFilter: null,
};

function formatMemoryRangeLabel(memoryRangeFilter: RangeFilter): string {
  const matchingRange = memorySizeRanges.find(
    (range) =>
      range.min === memoryRangeFilter.min &&
      range.max === memoryRangeFilter.max,
  );
  if (matchingRange) {
    return matchingRange.label;
  }
  if (
    memoryRangeFilter.min !== undefined &&
    memoryRangeFilter.max !== undefined
  ) {
    const minGB = Math.floor(memoryRangeFilter.min / 1024);
    const maxGB = Math.floor(memoryRangeFilter.max / 1024);
    return `${minGB}-${maxGB} GB`;
  }
  if (memoryRangeFilter.min !== undefined) {
    const minGB = Math.floor(memoryRangeFilter.min / 1024);
    return `≥ ${minGB} GB`;
  }
  if (memoryRangeFilter.max !== undefined) {
    const maxGB = Math.floor(memoryRangeFilter.max / 1024);
    return `≤ ${maxGB} GB`;
  }
  return "";
}

function formatUtilizationRangeLabel(
  rangeFilter: RangeFilter,
  category: string,
): string {
  const matchingRange = utilizationPercentRanges.find(
    (range) => range.min === rangeFilter.min && range.max === rangeFilter.max,
  );
  if (matchingRange) {
    return matchingRange.label;
  }
  if (rangeFilter.min !== undefined && rangeFilter.max !== undefined) {
    return `${rangeFilter.min}-${rangeFilter.max}%`;
  }
  if (rangeFilter.min !== undefined) {
    return `≥ ${rangeFilter.min}%`;
  }
  if (rangeFilter.max !== undefined) {
    return `≤ ${rangeFilter.max}%`;
  }
  return category;
}

function formatDiskRangeLabel(diskRangeFilter: RangeFilter): string {
  const matchingRange = diskSizeRanges.find(
    (range) =>
      range.min === diskRangeFilter.min && range.max === diskRangeFilter.max,
  );
  if (matchingRange) {
    return matchingRange.label;
  }
  if (diskRangeFilter.min !== undefined && diskRangeFilter.max !== undefined) {
    const minTB = Math.floor(diskRangeFilter.min / (1024 * 1024));
    const maxTB = Math.floor(diskRangeFilter.max / (1024 * 1024));
    return `${minTB}-${maxTB} TB`;
  }
  if (diskRangeFilter.min !== undefined) {
    const minTB = Math.floor(diskRangeFilter.min / (1024 * 1024));
    return `≥ ${minTB} TB`;
  }
  if (diskRangeFilter.max !== undefined) {
    const maxTB = Math.floor(diskRangeFilter.max / (1024 * 1024));
    return `≤ ${maxTB} TB`;
  }
  return "";
}

/** Builds filter chip descriptors from the current applied filter selection. */
export function buildAppliedFilters(
  selection: VMTableFilterSelection,
): AppliedFilter[] {
  const filters: AppliedFilter[] = [];

  if (selection.memoryRangeFilter) {
    const label = formatMemoryRangeLabel(selection.memoryRangeFilter);
    if (label) {
      filters.push({
        category: "Memory",
        label,
        key: "memorySize",
      });
    }
  }

  if (selection.cpuUsageRangeFilter) {
    const label = formatUtilizationRangeLabel(
      selection.cpuUsageRangeFilter,
      "CPU usage",
    );
    if (label) {
      filters.push({
        category: "CPU usage",
        label,
        key: "cpuUsage",
      });
    }
  }

  if (selection.ramUsageRangeFilter) {
    const label = formatUtilizationRangeLabel(
      selection.ramUsageRangeFilter,
      "RAM usage",
    );
    if (label) {
      filters.push({
        category: "RAM usage",
        label,
        key: "ramUsage",
      });
    }
  }

  if (selection.diskUsageRangeFilter) {
    const label = formatUtilizationRangeLabel(
      selection.diskUsageRangeFilter,
      "Disk usage",
    );
    if (label) {
      filters.push({
        category: "Disk usage",
        label,
        key: "diskUsage",
      });
    }
  }

  if (selection.diskRangeFilter) {
    const label = formatDiskRangeLabel(selection.diskRangeFilter);
    if (label) {
      filters.push({
        category: "Disk size",
        label,
        key: "diskSize",
      });
    }
  }

  for (const status of selection.selectedStatuses) {
    filters.push({
      category: "Status",
      label: statusLabels[status] || status,
      key: `status-${status}`,
    });
  }

  for (const cluster of selection.selectedClusters) {
    filters.push({
      category: "Cluster",
      label: cluster,
      key: `cluster-${cluster}`,
    });
  }

  for (const datacenter of selection.selectedDatacenters) {
    filters.push({
      category: "Data center",
      label: datacenter,
      key: `datacenter-${datacenter}`,
    });
  }

  for (const status of selection.selectedMigrationReadiness) {
    filters.push({
      category: "Migration Readiness",
      label: status === "ready" ? "Ready" : "Not ready",
      key: `migration-readiness-${status}`,
    });
  }

  for (const label of selection.selectedVmLabels) {
    filters.push({
      category: "Label",
      label,
      key: `vm-label-${label}`,
    });
  }

  for (const category of selection.selectedConcernCategories) {
    filters.push({
      category: "Issue category",
      label: category,
      key: `concern-category-${category}`,
    });
  }

  for (const concernLabel of selection.selectedConcernLabels) {
    filters.push({
      category: "Specific issue",
      label: concernLabel,
      key: `concern-${concernLabel}`,
    });
  }

  if (
    selection.hasIssuesFilter &&
    selection.selectedConcernLabels.length === 0 &&
    selection.selectedConcernCategories.length === 0
  ) {
    filters.push({
      category: "Issues",
      label: "Has issues",
      key: "hasIssues",
    });
  }

  if (
    selection.noIssuesFilter &&
    selection.selectedConcernLabels.length === 0 &&
    selection.selectedConcernCategories.length === 0
  ) {
    filters.push({
      category: "Issues",
      label: "No issues",
      key: "noIssues",
    });
  }

  return filters;
}

/** Returns updated filter selection after removing a chip by key. */
export function removeFilterFromSelection(
  selection: VMTableFilterSelection,
  filterKey: string,
): VMTableFilterSelection {
  if (filterKey === "memorySize") {
    return { ...selection, memoryRangeFilter: null };
  }
  if (filterKey === "cpuUsage") {
    return { ...selection, cpuUsageRangeFilter: null };
  }
  if (filterKey === "ramUsage") {
    return { ...selection, ramUsageRangeFilter: null };
  }
  if (filterKey === "diskUsage") {
    return { ...selection, diskUsageRangeFilter: null };
  }
  if (filterKey === "diskSize") {
    return { ...selection, diskRangeFilter: null };
  }
  if (filterKey.startsWith("status-")) {
    const status = filterKey.replace("status-", "");
    return {
      ...selection,
      selectedStatuses: selection.selectedStatuses.filter((s) => s !== status),
    };
  }
  if (filterKey.startsWith("cluster-")) {
    const cluster = filterKey.replace("cluster-", "");
    return {
      ...selection,
      selectedClusters: selection.selectedClusters.filter((c) => c !== cluster),
    };
  }
  if (filterKey.startsWith("datacenter-")) {
    const datacenter = filterKey.replace("datacenter-", "");
    return {
      ...selection,
      selectedDatacenters: selection.selectedDatacenters.filter(
        (d) => d !== datacenter,
      ),
    };
  }
  if (filterKey.startsWith("migration-readiness-")) {
    const status = filterKey.replace("migration-readiness-", "");
    return {
      ...selection,
      selectedMigrationReadiness: selection.selectedMigrationReadiness.filter(
        (s) => s !== status,
      ),
    };
  }
  if (filterKey.startsWith("vm-label-")) {
    const label = filterKey.replace("vm-label-", "");
    return {
      ...selection,
      selectedVmLabels: selection.selectedVmLabels.filter((l) => l !== label),
    };
  }
  if (filterKey.startsWith("concern-category-")) {
    const category = filterKey.replace("concern-category-", "");
    return {
      ...selection,
      selectedConcernCategories: selection.selectedConcernCategories.filter(
        (c) => c !== category,
      ),
    };
  }
  if (filterKey.startsWith("concern-")) {
    const concernLabel = filterKey.replace("concern-", "");
    return {
      ...selection,
      selectedConcernLabels: selection.selectedConcernLabels.filter(
        (c) => c !== concernLabel,
      ),
    };
  }
  if (filterKey === "hasIssues") {
    return { ...selection, hasIssuesFilter: false };
  }
  if (filterKey === "noIssues") {
    return { ...selection, noIssuesFilter: false };
  }
  return selection;
}

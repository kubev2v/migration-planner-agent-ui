import type { AttributeValueFilterAttribute } from "../../../../common/components/attribute-value-filter";
import type { RangeFilter } from "./vmTableFilterLogic";
import {
  diskSizeRanges,
  memorySizeRanges,
  statusLabels,
  utilizationPercentRanges,
} from "./vmTableShared";

type RangeDefinition = { label: string; min: number; max?: number };

function rangeToSelection(
  ranges: RangeDefinition[],
  filter: RangeFilter | null,
): string[] {
  if (!filter) {
    return [];
  }
  const index = ranges.findIndex(
    (range) => range.min === filter.min && range.max === filter.max,
  );
  return index >= 0 ? [String(index)] : [];
}

function createSingleRangeAttribute(
  id: string,
  label: string,
  ranges: RangeDefinition[],
  current: RangeFilter | null,
  onChange: (value: RangeFilter | null) => void,
): AttributeValueFilterAttribute {
  return {
    id,
    label,
    type: "checkbox",
    options: ranges.map((range, index) => ({
      value: String(index),
      label: range.label,
    })),
    selections: rangeToSelection(ranges, current),
    onSelectionsChange: (selections) => {
      if (selections.length === 0) {
        onChange(null);
        return;
      }
      const index = Number(selections[0]);
      const range = ranges[index];
      if (!range) {
        onChange(null);
        return;
      }
      onChange({ min: range.min, max: range.max });
    },
  };
}

export type BuildVmTableFilterAttributesParams = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedConcernCategories: string[];
  onConcernCategoriesChange: (values: string[]) => void;
  selectedConcernLabels: string[];
  onConcernLabelsChange: (values: string[]) => void;
  selectedDatacenters: string[];
  onDatacentersChange: (values: string[]) => void;
  selectedClusters: string[];
  onClustersChange: (values: string[]) => void;
  diskRangeFilter: RangeFilter | null;
  onDiskRangeChange: (value: RangeFilter | null) => void;
  memoryRangeFilter: RangeFilter | null;
  onMemoryRangeChange: (value: RangeFilter | null) => void;
  cpuUsageRangeFilter: RangeFilter | null;
  onCpuUsageRangeChange: (value: RangeFilter | null) => void;
  ramUsageRangeFilter: RangeFilter | null;
  onRamUsageRangeChange: (value: RangeFilter | null) => void;
  diskUsageRangeFilter: RangeFilter | null;
  onDiskUsageRangeChange: (value: RangeFilter | null) => void;
  selectedStatuses: string[];
  onStatusesChange: (values: string[]) => void;
  selectedMigrationReadiness: string[];
  onMigrationReadinessChange: (values: string[]) => void;
  selectedReportInclusion: string[];
  onReportInclusionChange: (values: string[]) => void;
  selectedVmLabels: string[];
  onVmLabelsChange: (values: string[]) => void;
  selectedGroups: string[];
  onGroupsChange: (values: string[]) => void;
  selectedApplications: string[];
  onApplicationsChange: (values: string[]) => void;
  hasIssuesFilter: boolean;
  noIssuesFilter: boolean;
  onIssuesFilterChange: (hasIssues: boolean, noIssues: boolean) => void;
  availableConcernCategories: string[];
  availableConcernLabels: string[];
  availableDatacenters: string[];
  availableClusters: string[];
  availableVmLabels: string[];
  availableGroups: string[];
  availableApplications: string[];
  showGroupsFilter: boolean;
  onCheckboxValueOpen?: () => void;
};

function applyCheckboxOpenHandlers(
  attributes: AttributeValueFilterAttribute[],
  onCheckboxValueOpen?: () => void,
): AttributeValueFilterAttribute[] {
  if (!onCheckboxValueOpen) {
    return attributes;
  }
  return attributes.map((attribute) => {
    if (
      attribute.type === "checkbox" ||
      attribute.type === "searchable-checkbox"
    ) {
      return { ...attribute, onOpen: onCheckboxValueOpen };
    }
    return attribute;
  });
}

export function buildVmTableFilterAttributes({
  searchValue,
  onSearchChange,
  selectedConcernCategories,
  onConcernCategoriesChange,
  selectedConcernLabels,
  onConcernLabelsChange,
  selectedDatacenters,
  onDatacentersChange,
  selectedClusters,
  onClustersChange,
  diskRangeFilter,
  onDiskRangeChange,
  memoryRangeFilter,
  onMemoryRangeChange,
  cpuUsageRangeFilter,
  onCpuUsageRangeChange,
  ramUsageRangeFilter,
  onRamUsageRangeChange,
  diskUsageRangeFilter,
  onDiskUsageRangeChange,
  selectedStatuses,
  onStatusesChange,
  selectedMigrationReadiness,
  onMigrationReadinessChange,
  selectedReportInclusion,
  onReportInclusionChange,
  selectedVmLabels,
  onVmLabelsChange,
  selectedGroups,
  onGroupsChange,
  selectedApplications,
  onApplicationsChange,
  hasIssuesFilter,
  noIssuesFilter,
  onIssuesFilterChange,
  availableConcernCategories,
  availableConcernLabels,
  availableDatacenters,
  availableClusters,
  availableVmLabels,
  availableGroups,
  availableApplications,
  showGroupsFilter,
  onCheckboxValueOpen,
}: BuildVmTableFilterAttributesParams): AttributeValueFilterAttribute[] {
  const issueSelections = [
    ...(hasIssuesFilter ? ["has-issues"] : []),
    ...(noIssuesFilter ? ["no-issues"] : []),
  ];

  const attributes: AttributeValueFilterAttribute[] = [
    {
      id: "name",
      label: "Name",
      type: "text",
      value: searchValue,
      onChange: onSearchChange,
      placeholder: "Find by VM name",
      ariaLabel: "Find by VM name",
    },
  ];

  if (availableConcernCategories.length > 0) {
    attributes.push({
      id: "issue-categories",
      label: "Issue categories",
      type: "checkbox",
      options: availableConcernCategories.map((category) => ({
        value: category,
        label: category,
      })),
      selections: selectedConcernCategories,
      onSelectionsChange: onConcernCategoriesChange,
    });
  }

  if (availableConcernLabels.length > 0) {
    attributes.push({
      id: "specific-issues",
      label: "Specific issues",
      type: "checkbox",
      options: availableConcernLabels.map((concernLabel) => ({
        value: concernLabel,
        label: concernLabel,
      })),
      selections: selectedConcernLabels,
      onSelectionsChange: onConcernLabelsChange,
    });
  }

  attributes.push({
    id: "issues",
    label: "Issues",
    type: "checkbox",
    options: [
      { value: "has-issues", label: "Has issues" },
      { value: "no-issues", label: "No issues" },
    ],
    selections: issueSelections,
    onSelectionsChange: (selections) => {
      onIssuesFilterChange(
        selections.includes("has-issues"),
        selections.includes("no-issues"),
      );
    },
  });

  if (availableDatacenters.length > 0) {
    attributes.push({
      id: "datacenter",
      label: "Data center",
      type: "checkbox",
      options: availableDatacenters.map((datacenter) => ({
        value: datacenter,
        label: datacenter,
      })),
      selections: selectedDatacenters,
      onSelectionsChange: onDatacentersChange,
    });
  }

  if (availableClusters.length > 0) {
    attributes.push({
      id: "cluster",
      label: "Cluster",
      type: "checkbox",
      options: availableClusters.map((cluster) => ({
        value: cluster,
        label: cluster,
      })),
      selections: selectedClusters,
      onSelectionsChange: onClustersChange,
    });
  }

  attributes.push(
    createSingleRangeAttribute(
      "disk-size",
      "Disk size",
      diskSizeRanges,
      diskRangeFilter,
      onDiskRangeChange,
    ),
    createSingleRangeAttribute(
      "memory-size",
      "Memory size",
      memorySizeRanges,
      memoryRangeFilter,
      onMemoryRangeChange,
    ),
    createSingleRangeAttribute(
      "cpu-usage",
      "CPU usage",
      utilizationPercentRanges,
      cpuUsageRangeFilter,
      onCpuUsageRangeChange,
    ),
    createSingleRangeAttribute(
      "ram-usage",
      "RAM usage",
      utilizationPercentRanges,
      ramUsageRangeFilter,
      onRamUsageRangeChange,
    ),
    createSingleRangeAttribute(
      "disk-usage",
      "Disk usage",
      utilizationPercentRanges,
      diskUsageRangeFilter,
      onDiskUsageRangeChange,
    ),
    {
      id: "status",
      label: "Status",
      type: "checkbox",
      options: Object.entries(statusLabels).map(([status, statusLabel]) => ({
        value: status,
        label: statusLabel,
      })),
      selections: selectedStatuses,
      onSelectionsChange: onStatusesChange,
    },
    {
      id: "migration-readiness",
      label: "Migration readiness",
      type: "checkbox",
      options: [
        { value: "ready", label: "Ready" },
        { value: "not-ready", label: "Not ready" },
      ],
      selections: selectedMigrationReadiness,
      onSelectionsChange: onMigrationReadinessChange,
    },
    {
      id: "report-inclusion",
      label: "Report inclusion",
      type: "checkbox",
      options: [
        { value: "included", label: "Included" },
        { value: "excluded", label: "Excluded" },
      ],
      selections: selectedReportInclusion,
      onSelectionsChange: onReportInclusionChange,
    },
  );

  if (availableVmLabels.length > 0) {
    attributes.push({
      id: "labels",
      label: "Labels",
      type: "checkbox",
      options: availableVmLabels.map((label) => ({
        value: label,
        label,
      })),
      selections: selectedVmLabels,
      onSelectionsChange: onVmLabelsChange,
    });
  }

  if (showGroupsFilter && availableGroups.length > 0) {
    attributes.push({
      id: "groups",
      label: "Groups",
      type: "checkbox",
      options: availableGroups.map((group) => ({
        value: group,
        label: group,
      })),
      selections: selectedGroups,
      onSelectionsChange: onGroupsChange,
    });
  }

  if (availableApplications.length > 0) {
    attributes.push({
      id: "applications",
      label: "Applications",
      type: "searchable-checkbox",
      options: availableApplications.map((application) => ({
        value: application,
        label: application,
      })),
      selections: selectedApplications,
      onSelectionsChange: onApplicationsChange,
    });
  }

  return applyCheckboxOpenHandlers(attributes, onCheckboxValueOpen);
}

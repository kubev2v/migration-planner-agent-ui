import { css } from "@emotion/css";
import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  EllipsisVIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FilterIcon,
  MagicIcon,
} from "@patternfly/react-icons";
import { ColumnsIcon } from "@patternfly/react-icons/dist/esm/icons/columns-icon";
import {
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  type ThProps,
  Tr,
} from "@patternfly/react-table";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useLocalStorage from "../../../hooks/useLocalStorage";
import { TechnologyPreviewBadge } from "./TechnologyPreviewBadge";
import { filtersToSearchParams, type VMFilters } from "./vmFilters";

const filterStyles = {
  dropdownContent: css`
    padding: 24px;
    width: 1400px;
    max-width: 95vw;
    overflow: visible;
  `,

  filterGrid: css`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 24px;
  `,

  concernsColumn: css`
    max-height: 400px;
    overflow-y: auto;
  `,

  concernSelect: css`
    width: 100%;
    margin-top: 8px;
  `,

  columnTitle: css`
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 16px;
    color: var(--pf-t--global--text--color--regular);
  `,

  checkboxList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,

  footer: css`
    display: flex;
    justify-content: flex-start;
    gap: 16px;
    margin-top: 32px;
    padding-top: 20px;
  `,
};

interface VMTableProps {
  vms: VirtualMachine[];
  loading: boolean;
  initialFilters?: VMFilters;
  onVMClick?: (vmId: string) => void;
  totalVMs?: number;
  currentPage?: number;
  pageSize?: number;
  onFiltersChange?: (filters: VMFilters) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sortFields: string[]) => void;
  availableFilterOptions?: {
    clusters: string[];
    datacenters: string[];
    concernLabels: string[];
    concernCategories: string[];
  };
  selectedVMs?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onRunDeepInspection?: (includeVmId?: string) => void;
  hasInspectionResults?: boolean;
  inspectionActive?: boolean;
  onCancelInspection?: () => void;
  onResetInspection?: () => void;
}

type ColumnKey =
  | "name"
  | "vCenterState"
  | "id"
  | "usedResources"
  | "datacenter"
  | "cluster"
  | "diskSize"
  | "memory"
  | "issues"
  | "migratable"
  | "deepInspection";

// Backend supports sorting for these columns only
const SORTABLE_COLUMNS = [
  "name",
  "vCenterState",
  "cluster",
  "diskSize",
  "memory",
  "issues",
] as const;

type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

const isSortableColumn = (key: ColumnKey): key is SortableColumn =>
  SORTABLE_COLUMNS.includes(key as SortableColumn);

const Columns: Record<ColumnKey, string> = {
  name: "Name",
  vCenterState: "Status",
  migratable: "Migration Readiness",
  id: "ID",
  usedResources: "Used resources",
  datacenter: "Data center",
  cluster: "Cluster",
  diskSize: "Disk size",
  memory: "Memory size",
  issues: "Issues",
  deepInspection: "Deep inspection",
};

const ALL_COLUMN_KEYS = Object.keys(Columns) as ColumnKey[];

const MANDATORY_COLUMNS: ColumnKey[] = ["name"];

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [...ALL_COLUMN_KEYS];

const VISIBLE_COLUMNS_KEY = "vmTable.visibleColumns";
const VISIBLE_COLUMNS_VERSION = 3;

const statusLabels: Record<string, string> = {
  poweredOn: "Powered on",
  poweredOff: "Powered off",
  suspended: "Suspended",
};

// Disk size ranges in MB (displayed as TB)
const diskSizeRanges = [
  { label: "0-10 TB", min: 0, max: 10 * 1024 * 1024 },
  { label: "11-20 TB", min: 10 * 1024 * 1024 + 1, max: 20 * 1024 * 1024 },
  { label: "21-50 TB", min: 20 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 },
  { label: "50+ TB", min: 50 * 1024 * 1024 + 1, max: undefined },
];

// Memory size ranges in MB (displayed as GB)
const memorySizeRanges = [
  { label: "0-4 GB", min: 0, max: 4 * 1024 },
  { label: "5-16 GB", min: 4 * 1024 + 1, max: 16 * 1024 },
  { label: "17-32 GB", min: 16 * 1024 + 1, max: 32 * 1024 },
  { label: "33-64 GB", min: 32 * 1024 + 1, max: 64 * 1024 },
  { label: "65-128 GB", min: 64 * 1024 + 1, max: 128 * 1024 },
  { label: "129-256 GB", min: 128 * 1024 + 1, max: 256 * 1024 },
  { label: "256+ GB", min: 256 * 1024 + 1, max: undefined },
];

const MB_IN_GB = 1024;
const MB_IN_TB = 1024 * 1024;

// Client-side sort order for inspection states (lower index = first in asc order)
const inspectionStateOrder: Record<string, number> = {
  running: 0,
  pending: 1,
  completed: 2,
  error: 3,
  canceled: 4,
};

const getInspectionSortValue = (vm: VirtualMachine): number => {
  const state = vm.inspectionStatus?.state;
  return state !== undefined ? (inspectionStateOrder[state] ?? 99) : 99;
};

const formatDiskSize = (sizeInMB: number): string => {
  if (sizeInMB >= MB_IN_TB) {
    const sizeInTB = sizeInMB / MB_IN_TB;
    return `${sizeInTB.toFixed(sizeInTB % 1 === 0 ? 0 : 2)} TB`;
  }
  const sizeInGB = sizeInMB / MB_IN_GB;
  return `${sizeInGB.toFixed(sizeInGB % 1 === 0 ? 0 : 2)} GB`;
};

const formatMemorySize = (sizeInMB: number): string => {
  const sizeInGB = sizeInMB / MB_IN_GB;
  return `${sizeInGB.toFixed(sizeInGB % 1 === 0 ? 0 : 2)} GB`;
};

interface AppliedFilter {
  category: string;
  label: string;
  key: string;
}

// Emotion styles to fix sortable column header layout shifts
const styles = {
  vmTable: css`
    th button {
      display: flex;
      align-items: center;
      width: 100%;
      text-align: left;
      justify-content: space-between;
      gap: 0.5rem;
    }
  `,
};

export const VMTable: React.FC<VMTableProps> = ({
  vms,
  loading,
  initialFilters,
  onVMClick,
  totalVMs,
  currentPage = 1,
  pageSize: propPageSize = 20,
  onFiltersChange,
  onPageChange,
  onSortChange,
  availableFilterOptions = {
    clusters: [],
    datacenters: [],
    concernLabels: [],
    concernCategories: [],
  },
  selectedVMs = new Set<string>(),
  onSelectionChange,
  onRunDeepInspection,
  hasInspectionResults = false,
  inspectionActive = false,
  onCancelInspection,
  onResetInspection,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Use props for pagination state (controlled by parent)
  const page = currentPage;
  const pageSize = propPageSize;

  // Column visibility state (persisted in localStorage)
  const [userSelectedColumns, setUserSelectedColumns] = useLocalStorage<
    ColumnKey[]
  >(VISIBLE_COLUMNS_KEY, DEFAULT_VISIBLE_COLUMNS, VISIBLE_COLUMNS_VERSION);

  const [isColumnSelectOpen, setIsColumnSelectOpen] = useState(false);

  const visibleColumns = useMemo(
    () =>
      Array.from(
        new Set([
          ...userSelectedColumns.filter((key) => ALL_COLUMN_KEYS.includes(key)),
          ...MANDATORY_COLUMNS,
        ]),
      ),
    [userSelectedColumns],
  );

  const isColumnVisible = useCallback(
    (key: ColumnKey): boolean => visibleColumns.includes(key),
    [visibleColumns],
  );

  const toggleColumn = useCallback(
    (key: ColumnKey) => {
      if (MANDATORY_COLUMNS.includes(key)) return;
      setUserSelectedColumns((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    },
    [setUserSelectedColumns],
  );

  // Search state
  const [searchValue, setSearchValue] = useState(initialFilters?.search || "");

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isConcernSelectOpen, setIsConcernSelectOpen] = useState(false);

  // Deep inspection kebab & cancel confirmation
  const [isInspectionKebabOpen, setIsInspectionKebabOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Client-side filter state (applied filters)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialFilters?.statuses || [],
  );
  const [selectedClusters, setSelectedClusters] = useState<string[]>(
    initialFilters?.clusters || [],
  );
  const [selectedDatacenters, setSelectedDatacenters] = useState<string[]>(
    initialFilters?.datacenters || [],
  );
  const [selectedMigrationReadiness, setSelectedMigrationReadiness] = useState<
    string[]
  >(initialFilters?.migrationReadiness || []);
  const [selectedConcernLabels, setSelectedConcernLabels] = useState<string[]>(
    initialFilters?.concernLabels || [],
  );
  const [selectedConcernCategories, setSelectedConcernCategories] = useState<
    string[]
  >(initialFilters?.concernCategories || []);
  const [hasIssuesFilter, setHasIssuesFilter] = useState(
    initialFilters?.hasIssues || false,
  );
  const [noIssuesFilter, setNoIssuesFilter] = useState(
    initialFilters?.noIssues || false,
  );
  const [diskRangeFilter, setDiskRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(initialFilters?.diskRange || null);
  const [memoryRangeFilter, setMemoryRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(initialFilters?.memoryRange || null);

  // Temporary filter state (for modal, not yet applied)
  const [tempSelectedStatuses, setTempSelectedStatuses] = useState<string[]>(
    [],
  );
  const [tempSelectedClusters, setTempSelectedClusters] = useState<string[]>(
    [],
  );
  const [tempSelectedDatacenters, setTempSelectedDatacenters] = useState<
    string[]
  >([]);
  const [tempSelectedMigrationReadiness, setTempSelectedMigrationReadiness] =
    useState<string[]>([]);
  const [tempSelectedConcernLabels, setTempSelectedConcernLabels] = useState<
    string[]
  >([]);
  const [tempSelectedConcernCategories, setTempSelectedConcernCategories] =
    useState<string[]>([]);
  const [tempHasIssuesFilter, setTempHasIssuesFilter] = useState(false);
  const [tempNoIssuesFilter, setTempNoIssuesFilter] = useState(false);
  const [tempDiskRangeFilter, setTempDiskRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(null);
  const [tempMemoryRangeFilter, setTempMemoryRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(null);

  // Sync local state with initialFilters when they change (e.g., from chart navigation)
  useEffect(() => {
    // Skip if changes come from user interaction
    if (isUserInteraction.current) return;

    // Only sync if we're on the VMs tab
    const currentTab = searchParams.get("tab");
    if (currentTab !== "vms") return;

    setDiskRangeFilter(initialFilters?.diskRange || null);
    setMemoryRangeFilter(initialFilters?.memoryRange || null);
    setSelectedStatuses(initialFilters?.statuses || []);
    setSelectedClusters(initialFilters?.clusters || []);
    setSelectedDatacenters(initialFilters?.datacenters || []);
    setSelectedMigrationReadiness(initialFilters?.migrationReadiness || []);
    setSelectedConcernLabels(initialFilters?.concernLabels || []);
    setSelectedConcernCategories(initialFilters?.concernCategories || []);
    setHasIssuesFilter(initialFilters?.hasIssues || false);
    setNoIssuesFilter(initialFilters?.noIssues || false);
    setSearchValue(initialFilters?.search || "");
  }, [initialFilters, searchParams]);
  // Selection state
  // const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set());

  // Row actions dropdown state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Sort state - tracked by column key so it survives column visibility changes
  const [sortByColumnKey, setSortByColumnKey] = useState<ColumnKey | null>(
    null,
  );
  const [activeSortDirection, setActiveSortDirection] = useState<
    "asc" | "desc"
  >("asc");

  // Reset sort when the sorted column is hidden
  useEffect(() => {
    if (sortByColumnKey && !isColumnVisible(sortByColumnKey)) {
      setSortByColumnKey(null);
      onSortChange?.([]);
    }
  }, [sortByColumnKey, isColumnVisible, onSortChange]);

  // Column definitions - filtered by visibility
  const columns = useMemo(
    () =>
      ALL_COLUMN_KEYS.filter((key) => {
        if (key === "deepInspection") {
          return isColumnVisible(key) && hasInspectionResults;
        }
        return isColumnVisible(key);
      }).map((key) => ({
        key,
        label: Columns[key],
        sortable: isSortableColumn(key),
      })),
    [isColumnVisible, hasInspectionResults],
  );

  // Use filter options from props (pre-fetched from parent)
  const availableClusters = availableFilterOptions.clusters;
  const availableDatacenters = availableFilterOptions.datacenters;
  const availableConcernLabels = availableFilterOptions.concernLabels;
  const availableConcernCategories = availableFilterOptions.concernCategories;

  // Track if filter changes come from user interaction (not from URL sync)
  const isUserInteraction = useRef(false);

  // Update URL and trigger backend refetch when filters change due to user interaction
  useEffect(() => {
    // Skip if changes come from URL sync (initialFilters change)
    if (!isUserInteraction.current) {
      return;
    }

    const currentTab = searchParams.get("tab");

    // Don't update if we're explicitly on a different tab (like "overview")
    if (currentTab && currentTab !== "vms") {
      return;
    }

    // If no tab param, only update if there are some filters set
    if (!currentTab) {
      const hasAnyFilter = !!(
        selectedStatuses.length > 0 ||
        selectedClusters.length > 0 ||
        selectedDatacenters.length > 0 ||
        selectedMigrationReadiness.length > 0 ||
        selectedConcernLabels.length > 0 ||
        selectedConcernCategories.length > 0 ||
        hasIssuesFilter ||
        noIssuesFilter ||
        searchValue ||
        diskRangeFilter ||
        memoryRangeFilter
      );
      if (!hasAnyFilter) {
        return;
      }
    }

    const currentFilters: VMFilters = {
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      clusters: selectedClusters.length > 0 ? selectedClusters : undefined,
      datacenters:
        selectedDatacenters.length > 0 ? selectedDatacenters : undefined,
      hasIssues: hasIssuesFilter || undefined,
      noIssues: noIssuesFilter || undefined,
      search: searchValue || undefined,
      diskRange: diskRangeFilter || undefined,
      memoryRange: memoryRangeFilter || undefined,
      migrationReadiness:
        selectedMigrationReadiness.length > 0
          ? selectedMigrationReadiness
          : undefined,
      concernLabels:
        selectedConcernLabels.length > 0 ? selectedConcernLabels : undefined,
      concernCategories:
        selectedConcernCategories.length > 0
          ? selectedConcernCategories
          : undefined,
    };

    const newParams = filtersToSearchParams(currentFilters);
    newParams.set("tab", "vms");

    setSearchParams(newParams, { replace: true });

    // Trigger backend filter update
    onFiltersChange?.(currentFilters);

    isUserInteraction.current = false; // Reset flag after updating URL
  }, [
    selectedStatuses,
    selectedClusters,
    selectedDatacenters,
    selectedMigrationReadiness,
    selectedConcernLabels,
    selectedConcernCategories,
    hasIssuesFilter,
    noIssuesFilter,
    searchValue,
    diskRangeFilter,
    memoryRangeFilter,
    searchParams,
    setSearchParams,
    onFiltersChange,
  ]);

  // Build list of applied filters for chip display
  const appliedFilters = useMemo(() => {
    const filters: AppliedFilter[] = [];

    // Memory range filter
    if (memoryRangeFilter) {
      const matchingRange = memorySizeRanges.find(
        (range) =>
          range.min === memoryRangeFilter.min &&
          range.max === memoryRangeFilter.max,
      );

      let label = "";
      if (matchingRange) {
        label = matchingRange.label;
      } else if (
        memoryRangeFilter.min !== undefined &&
        memoryRangeFilter.max !== undefined
      ) {
        const minGB = Math.floor(memoryRangeFilter.min / 1024);
        const maxGB = Math.floor(memoryRangeFilter.max / 1024);
        label = `${minGB}-${maxGB} GB`;
      } else if (memoryRangeFilter.min !== undefined) {
        const minGB = Math.floor(memoryRangeFilter.min / 1024);
        label = `≥ ${minGB} GB`;
      } else if (memoryRangeFilter.max !== undefined) {
        const maxGB = Math.floor(memoryRangeFilter.max / 1024);
        label = `≤ ${maxGB} GB`;
      }

      if (label) {
        filters.push({
          category: "Memory",
          label,
          key: "memorySize",
        });
      }
    }

    // Disk range filter
    if (diskRangeFilter) {
      const matchingRange = diskSizeRanges.find(
        (range) =>
          range.min === diskRangeFilter.min &&
          range.max === diskRangeFilter.max,
      );

      let label = "";
      if (matchingRange) {
        label = matchingRange.label;
      } else if (
        diskRangeFilter.min !== undefined &&
        diskRangeFilter.max !== undefined
      ) {
        const minTB = Math.floor(diskRangeFilter.min / (1024 * 1024));
        const maxTB = Math.floor(diskRangeFilter.max / (1024 * 1024));
        label = `${minTB}-${maxTB} TB`;
      } else if (diskRangeFilter.min !== undefined) {
        const minTB = Math.floor(diskRangeFilter.min / (1024 * 1024));
        label = `≥ ${minTB} TB`;
      } else if (diskRangeFilter.max !== undefined) {
        const maxTB = Math.floor(diskRangeFilter.max / (1024 * 1024));
        label = `≤ ${maxTB} TB`;
      }

      if (label) {
        filters.push({
          category: "Disk size",
          label,
          key: "diskSize",
        });
      }
    }

    // Status filters
    selectedStatuses.forEach((status) => {
      filters.push({
        category: "Status",
        label: statusLabels[status] || status,
        key: `status-${status}`,
      });
    });

    // Cluster filters
    selectedClusters.forEach((cluster) => {
      filters.push({
        category: "Cluster",
        label: cluster,
        key: `cluster-${cluster}`,
      });
    });

    // Datacenter filters
    selectedDatacenters.forEach((datacenter) => {
      filters.push({
        category: "Data center",
        label: datacenter,
        key: `datacenter-${datacenter}`,
      });
    });

    // Migration Readiness filters
    selectedMigrationReadiness.forEach((status) => {
      filters.push({
        category: "Migration Readiness",
        label: status === "ready" ? "Ready" : "Not ready",
        key: `migration-readiness-${status}`,
      });
    });

    // Concern categories filters
    selectedConcernCategories.forEach((category) => {
      filters.push({
        category: "Issue category",
        label: category,
        key: `concern-category-${category}`,
      });
    });

    // Concern labels filters (specific issues)
    selectedConcernLabels.forEach((concernLabel) => {
      filters.push({
        category: "Specific issue",
        label: concernLabel,
        key: `concern-${concernLabel}`,
      });
    });

    // Issues filter (only show if no specific concerns/categories selected)
    if (
      hasIssuesFilter &&
      selectedConcernLabels.length === 0 &&
      selectedConcernCategories.length === 0
    ) {
      filters.push({
        category: "Issues",
        label: "Has issues",
        key: "hasIssues",
      });
    }

    // No issues filter (only show if no specific concerns/categories selected)
    if (
      noIssuesFilter &&
      selectedConcernLabels.length === 0 &&
      selectedConcernCategories.length === 0
    ) {
      filters.push({
        category: "Issues",
        label: "No issues",
        key: "noIssues",
      });
    }

    return filters;
  }, [
    selectedStatuses,
    selectedClusters,
    selectedDatacenters,
    selectedMigrationReadiness,
    selectedConcernLabels,
    selectedConcernCategories,
    hasIssuesFilter,
    noIssuesFilter,
    diskRangeFilter,
    memoryRangeFilter,
  ]);

  // No client-side filtering - handled by backend
  // VMs are already filtered, sorted, and paginated by the backend

  const backendFieldMap: Record<SortableColumn, string> = {
    name: "name",
    vCenterState: "vCenterState",
    cluster: "cluster",
    diskSize: "diskSize",
    memory: "memory",
    issues: "issues",
  };

  // Apply client-side sort for deepInspection; all other columns use backend sort.
  // Skip reordering while inspection is active so rows don't jump as statuses change.
  const displayVMs = useMemo(() => {
    if (sortByColumnKey !== "deepInspection" || inspectionActive) return vms;
    return [...vms].sort((a, b) => {
      const diff = getInspectionSortValue(a) - getInspectionSortValue(b);
      return activeSortDirection === "asc" ? diff : -diff;
    });
  }, [vms, sortByColumnKey, activeSortDirection, inspectionActive]);

  // Sort handler - triggers backend sort, tracks by column key
  const getSortParams = (
    columnKey: ColumnKey,
    columnIndex: number,
  ): ThProps["sort"] => ({
    sortBy: {
      index: sortByColumnKey
        ? columns.findIndex((c) => c.key === sortByColumnKey)
        : undefined,
      direction: activeSortDirection,
    },
    onSort: (_event, _index, direction) => {
      setSortByColumnKey(columnKey);
      setActiveSortDirection(direction);

      if (isSortableColumn(columnKey)) {
        // Backend sort
        const sortField = backendFieldMap[columnKey];
        onSortChange?.([`${sortField}:${direction}`]);
      } else {
        // Client-side only (e.g., deepInspection) — clear any active backend sort
        onSortChange?.([]);
      }
    },
    columnIndex,
  });

  // Apply filters from modal
  const applyFilters = () => {
    isUserInteraction.current = true;
    setSelectedStatuses(tempSelectedStatuses);
    setSelectedClusters(tempSelectedClusters);
    setSelectedDatacenters(tempSelectedDatacenters);
    setSelectedMigrationReadiness(tempSelectedMigrationReadiness);
    setSelectedConcernLabels(tempSelectedConcernLabels);
    setSelectedConcernCategories(tempSelectedConcernCategories);
    setHasIssuesFilter(tempHasIssuesFilter);
    setNoIssuesFilter(tempNoIssuesFilter);
    setDiskRangeFilter(tempDiskRangeFilter);
    setMemoryRangeFilter(tempMemoryRangeFilter);
    onPageChange?.(1, pageSize); // Reset to page 1
    setIsFilterModalOpen(false);
    setIsConcernSelectOpen(false);
    // Reset temporary filters after applying
    resetTempFilters();
  };

  // Cancel filter modal
  const cancelFilterModal = () => {
    setIsFilterModalOpen(false);
    setIsConcernSelectOpen(false);
    // Reset temporary filters when canceling
    resetTempFilters();
  };

  // Reset temporary filters to empty state
  const resetTempFilters = () => {
    setTempSelectedStatuses([]);
    setTempSelectedClusters([]);
    setTempSelectedDatacenters([]);
    setTempSelectedMigrationReadiness([]);
    setTempSelectedConcernLabels([]);
    setTempSelectedConcernCategories([]);
    setTempHasIssuesFilter(false);
    setTempNoIssuesFilter(false);
    setTempDiskRangeFilter(null);
    setTempMemoryRangeFilter(null);
  };

  // Initialize temporary filters when opening modal
  // Always sync temp filters with current applied filters when modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      // Sync temp filters with currently applied filters
      setTempSelectedStatuses(selectedStatuses);
      setTempSelectedClusters(selectedClusters);
      setTempSelectedDatacenters(selectedDatacenters);
      setTempSelectedMigrationReadiness(selectedMigrationReadiness);
      setTempSelectedConcernLabels(selectedConcernLabels);
      setTempSelectedConcernCategories(selectedConcernCategories);
      setTempHasIssuesFilter(hasIssuesFilter);
      setTempNoIssuesFilter(noIssuesFilter);
      setTempDiskRangeFilter(diskRangeFilter);
      setTempMemoryRangeFilter(memoryRangeFilter);
    }
  }, [
    isFilterModalOpen,
    selectedStatuses,
    selectedClusters,
    selectedDatacenters,
    selectedMigrationReadiness,
    selectedConcernLabels,
    selectedConcernCategories,
    hasIssuesFilter,
    noIssuesFilter,
    diskRangeFilter,
    memoryRangeFilter,
  ]);

  // Toggle temporary filter selections in modal
  const toggleTempStatus = (status: string) => {
    setTempSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const toggleTempCluster = (cluster: string) => {
    setTempSelectedClusters((prev) =>
      prev.includes(cluster)
        ? prev.filter((c) => c !== cluster)
        : [...prev, cluster],
    );
  };

  const toggleTempDatacenter = (datacenter: string) => {
    setTempSelectedDatacenters((prev) =>
      prev.includes(datacenter)
        ? prev.filter((d) => d !== datacenter)
        : [...prev, datacenter],
    );
  };

  const toggleTempMigrationReadiness = (status: string) => {
    setTempSelectedMigrationReadiness(
      tempSelectedMigrationReadiness.includes(status)
        ? tempSelectedMigrationReadiness.filter((s) => s !== status)
        : [...tempSelectedMigrationReadiness, status],
    );
  };

  const toggleTempConcernLabel = (concernLabel: string) => {
    setTempSelectedConcernLabels((prev) =>
      prev.includes(concernLabel)
        ? prev.filter((c) => c !== concernLabel)
        : [...prev, concernLabel],
    );
  };

  const toggleTempConcernCategory = (category: string) => {
    setTempSelectedConcernCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const toggleTempDiskRange = (index: number) => {
    const range = diskSizeRanges[index];
    const isSameRange =
      tempDiskRangeFilter?.min === range.min &&
      tempDiskRangeFilter?.max === range.max;
    setTempDiskRangeFilter(
      isSameRange ? null : { min: range.min, max: range.max },
    );
  };

  const toggleTempMemoryRange = (index: number) => {
    const range = memorySizeRanges[index];
    const isSameRange =
      tempMemoryRangeFilter?.min === range.min &&
      tempMemoryRangeFilter?.max === range.max;
    setTempMemoryRangeFilter(
      isSameRange ? null : { min: range.min, max: range.max },
    );
  };

  // Remove individual filter
  const removeFilter = (filterKey: string) => {
    isUserInteraction.current = true;
    if (filterKey === "memorySize") {
      setMemoryRangeFilter(null);
    } else if (filterKey === "diskSize") {
      setDiskRangeFilter(null);
    } else if (filterKey.startsWith("status-")) {
      const status = filterKey.replace("status-", "");
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else if (filterKey.startsWith("cluster-")) {
      const cluster = filterKey.replace("cluster-", "");
      setSelectedClusters(selectedClusters.filter((c) => c !== cluster));
    } else if (filterKey.startsWith("datacenter-")) {
      const datacenter = filterKey.replace("datacenter-", "");
      setSelectedDatacenters(
        selectedDatacenters.filter((d) => d !== datacenter),
      );
    } else if (filterKey.startsWith("migration-readiness-")) {
      const status = filterKey.replace("migration-readiness-", "");
      setSelectedMigrationReadiness(
        selectedMigrationReadiness.filter((s) => s !== status),
      );
    } else if (filterKey.startsWith("concern-category-")) {
      const category = filterKey.replace("concern-category-", "");
      setSelectedConcernCategories(
        selectedConcernCategories.filter((c) => c !== category),
      );
    } else if (filterKey.startsWith("concern-")) {
      const concernLabel = filterKey.replace("concern-", "");
      setSelectedConcernLabels(
        selectedConcernLabels.filter((c) => c !== concernLabel),
      );
    } else if (filterKey === "hasIssues") {
      setHasIssuesFilter(false);
    } else if (filterKey === "noIssues") {
      setNoIssuesFilter(false);
    }
    onPageChange?.(1, pageSize); // Reset to page 1
  };

  // Clear all filters
  const clearAllFilters = () => {
    isUserInteraction.current = true;
    setSelectedStatuses([]);
    setSelectedClusters([]);
    setSelectedDatacenters([]);
    setSelectedMigrationReadiness([]);
    setSelectedConcernLabels([]);
    setSelectedConcernCategories([]);
    setHasIssuesFilter(false);
    setNoIssuesFilter(false);
    setSearchValue("");
    setDiskRangeFilter(null);
    setMemoryRangeFilter(null);
    onPageChange?.(1, pageSize); // Reset to page 1
  };

  // Search handlers
  const handleSearchChange = (_event: React.FormEvent, value: string) => {
    isUserInteraction.current = true;
    setSearchValue(value);
  };

  const handleSearchClear = () => {
    isUserInteraction.current = true;
    setSearchValue("");
  };

  const onSelectVM = (vm: VirtualMachine, isSelected: boolean) => {
    const newSelected = new Set(selectedVMs);
    if (isSelected) {
      newSelected.add(vm.id);
    } else {
      newSelected.delete(vm.id);
    }
    onSelectionChange?.(newSelected);
  };

  // Render status cell with icon
  const renderStatus = (vm: VirtualMachine) => {
    const state = vm.vCenterState || "poweredOff";
    const hasIssues = (vm.issueCount || 0) > 0;

    return (
      <span>
        {state === "poweredOff" && (
          <>
            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />{" "}
          </>
        )}
        {state === "suspended" && (
          <>
            <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />{" "}
          </>
        )}
        {state === "poweredOn" && hasIssues && (
          <>
            <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />{" "}
          </>
        )}
        {state === "poweredOn" && !hasIssues && (
          <>
            <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />{" "}
          </>
        )}
        {statusLabels[state] || state}
      </span>
    );
  };

  const renderInspectionStatus = (vm: VirtualMachine) => {
    const status = vm.inspectionStatus;
    if (!status) return "Not run";

    const state = status.state;
    const goToDetail = onVMClick ? () => onVMClick(vm.id) : undefined;

    if (state === "pending" || state === "running") {
      return (
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Spinner size="sm" /> {state === "pending" ? "Pending" : "Running"}
        </span>
      );
    }

    if (state === "completed" || state === "error") {
      const concernCount = vm.inspectionConcernCount || 0;
      const label = `${concernCount} ${concernCount === 1 ? "issue" : "issues"}`;
      return goToDetail ? (
        <Button variant="link" isInline onClick={goToDetail}>
          {label}
        </Button>
      ) : (
        label
      );
    }

    if (state === "canceled") {
      return (
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Label color="grey" isCompact>
            Canceled
          </Label>
        </span>
      );
    }

    return "Not run";
  };

  return (
    <div className={styles.vmTable}>
      {/* Toolbar */}
      <Toolbar>
        <ToolbarContent>
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
                onOpenChange={setIsFilterModalOpen}
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
                }}
              >
                <div className={filterStyles.dropdownContent}>
                  <div className={filterStyles.filterGrid}>
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
                      <h3 className={filterStyles.columnTitle}>
                        Specific issues
                      </h3>
                      <div className={filterStyles.checkboxList}>
                        {availableConcernLabels.length > 0 && (
                          <Select
                            isOpen={isConcernSelectOpen}
                            selected={tempSelectedConcernLabels}
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
                            toggle={(
                              toggleRef: React.Ref<MenuToggleElement>,
                            ) => (
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
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
                            isChecked={tempSelectedDatacenters.includes(
                              datacenter,
                            )}
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
                          onChange={() =>
                            toggleTempMigrationReadiness("not-ready")
                          }
                        />
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
                  {ALL_COLUMN_KEYS.filter(
                    (key) => key !== "deepInspection" || hasInspectionResults,
                  ).map((key) => (
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
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarItem>
              <Tooltip content="Select VMs for deep inspection.">
                <Button
                  variant="primary"
                  icon={<MagicIcon />}
                  isDisabled={selectedVMs.size === 0}
                  onClick={() => onRunDeepInspection?.()}
                >
                  Run deep inspection
                </Button>
              </Tooltip>
              <TechnologyPreviewBadge />
            </ToolbarItem>
            <ToolbarItem>
              <Dropdown
                isOpen={isInspectionKebabOpen}
                onSelect={() => setIsInspectionKebabOpen(false)}
                onOpenChange={setIsInspectionKebabOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    variant="plain"
                    onClick={() =>
                      setIsInspectionKebabOpen(!isInspectionKebabOpen)
                    }
                    isExpanded={isInspectionKebabOpen}
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
                popperProps={{ position: "right" }}
              >
                <DropdownList>
                  {inspectionActive && (
                    <DropdownItem
                      key="cancel-inspection"
                      onClick={() => setIsCancelConfirmOpen(true)}
                    >
                      Cancel deep inspection
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="reset-inspection"
                    onClick={() => onResetInspection?.()}
                  >
                    Reset deep inspection
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
            {inspectionActive && (
              <ToolbarItem>
                <Spinner size="md" />
              </ToolbarItem>
            )}
          </ToolbarGroup>

          <ToolbarItem variant="pagination" align={{ default: "alignEnd" }}>
            <Pagination
              itemCount={totalVMs ?? vms.length}
              perPage={pageSize}
              page={page}
              onSetPage={(_event, newPage) => onPageChange?.(newPage, pageSize)}
              onPerPageSelect={(_event, newPerPage) => {
                onPageChange?.(1, newPerPage);
              }}
              variant="top"
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>

        {/* Applied filters chips */}
        {appliedFilters.length > 0 && (
          <ToolbarContent alignItems="center">
            <ToolbarItem>
              <LabelGroup categoryName="Filters">
                {appliedFilters.map((filter) => (
                  <Label
                    key={filter.key}
                    onClose={() => removeFilter(filter.key)}
                  >
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
        )}
      </Toolbar>

      {/* Table */}
      <Table
        aria-label="Virtual machines table"
        variant="compact"
        borders={false}
        isStickyHeader
      >
        <Thead>
          <Tr>
            <Th screenReaderText="Select" />
            {columns.map((column, index) => {
              const getWidth = (key: ColumnKey) => {
                switch (key) {
                  case "name":
                    return hasInspectionResults ? 15 : 20;
                  case "vCenterState":
                    return hasInspectionResults ? 10 : 15;
                  case "migratable":
                    return hasInspectionResults ? 10 : 15;
                  case "id":
                    return hasInspectionResults ? 10 : 15;
                  case "datacenter":
                    return 10;
                  case "cluster":
                    return 10;
                  case "diskSize":
                    return 10;
                  case "memory":
                    return 10;
                  case "issues":
                    return 10;
                  case "usedResources":
                    return 20;
                  case "deepInspection":
                    return 15;
                  default:
                    return undefined;
                }
              };

              const getModifier = (key: ColumnKey) => {
                if (key === "issues" || key === "migratable") {
                  return "fitContent";
                }
                return "nowrap";
              };

              return (
                <Th
                  key={column.key}
                  sort={
                    column.sortable
                      ? getSortParams(column.key, index)
                      : undefined
                  }
                  width={getWidth(column.key)}
                  modifier={getModifier(column.key)}
                >
                  {column.label}
                </Th>
              );
            })}
            <Th width={10} modifier="fitContent" screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {loading ? (
            <Tr>
              <Td colSpan={columns.length + 2}>Loading...</Td>
            </Tr>
          ) : vms.length === 0 ? (
            <Tr>
              <Td colSpan={columns.length + 2}>No virtual machines found</Td>
            </Tr>
          ) : (
            displayVMs.map((vm, rowIndex) => (
              <Tr key={vm.id}>
                <Td
                  select={{
                    rowIndex,
                    onSelect: (_event, isSelected) =>
                      onSelectVM(vm, isSelected),
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
                    {onVMClick ? (
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
                  </Td>
                )}
                {isColumnVisible("vCenterState") && (
                  <Td dataLabel="Status">{renderStatus(vm)}</Td>
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
                {isColumnVisible("usedResources") && (
                  <Td dataLabel="Used resources" modifier="fitContent">
                    CPU: <b>{vm.utilizationCpuP95 || 0}%</b> | Disk:{" "}
                    <b>{vm.utilizationDisk || 0}%</b> | RAM:{" "}
                    <b>{vm.utilizationMemP95 || 0}%</b>
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
                    {renderInspectionStatus(vm)}
                  </Td>
                )}
                <Td isActionCell modifier="fitContent">
                  <Dropdown
                    isOpen={openActionMenuId === vm.id}
                    onSelect={() => setOpenActionMenuId(null)}
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
                      <DropdownItem
                        key="details"
                        onClick={() => onVMClick?.(vm.id)}
                      >
                        View details
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      {/* Cancel deep inspection confirmation modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        aria-labelledby="cancel-inspection-title"
        aria-describedby="cancel-inspection-body"
        variant="small"
      >
        <ModalHeader
          title="Cancel deep inspection"
          titleIconVariant="warning"
          labelId="cancel-inspection-title"
        />
        <ModalBody id="cancel-inspection-body">
          <Content component="p">Are you sure you want to proceed?</Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={() => {
              onCancelInspection?.();
              setIsCancelConfirmOpen(false);
            }}
          >
            Confirm
          </Button>
          <Button variant="link" onClick={() => setIsCancelConfirmOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

VMTable.displayName = "VMTable";

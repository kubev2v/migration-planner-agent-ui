import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type { ThProps } from "@patternfly/react-table";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import useLocalStorage from "../../../../hooks/useLocalStorage";
import type { VirtualMachineWithGroupItems } from "../../../Groups/utils/vmGroupMembership";
import { filtersToSearchParams, type VMFilters } from "./vmFilters";
import { buildVmTableFilterAttributes } from "./vmTableFilterAttributes";
import {
  EMPTY_VM_TABLE_FILTER_SELECTION,
  type VMTableFilterSelection,
} from "./vmTableFilterLogic";
import {
  type BackendSortableColumn,
  type ColumnKey,
  Columns,
  DEFAULT_VISIBLE_COLUMNS,
  FRONTEND_SORT_METHODS,
  type FrontendSortableColumn,
  isBackendSortableColumn,
  isSortableColumn,
  MANDATORY_COLUMNS,
  resolveVisibleColumns,
  VISIBLE_COLUMNS_KEY,
  VISIBLE_COLUMNS_VERSION,
  VM_TABLE_VARIANT_UI,
} from "./vmTableShared";
import type { UseVMTableLogicParams } from "./vmTableTypes";

const EMPTY_STRING_ARRAY: string[] = [];

type RangeFilterValue = { min: number; max?: number };

function stringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function syncStringArrayState(
  setter: Dispatch<SetStateAction<string[]>>,
  next: string[] | undefined,
): void {
  const resolved = next ?? EMPTY_STRING_ARRAY;
  setter((previous) =>
    stringArraysEqual(previous, resolved) ? previous : resolved,
  );
}

function rangesEqual(
  a: RangeFilterValue | null,
  b: RangeFilterValue | null,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.min === b.min && a.max === b.max;
}

function syncRangeState(
  setter: Dispatch<SetStateAction<RangeFilterValue | null>>,
  next: RangeFilterValue | null | undefined,
): void {
  const resolved = next ?? null;
  setter((previous) => (rangesEqual(previous, resolved) ? previous : resolved));
}

export function useVMTableLogic({
  vms,
  initialFilters,
  totalVMs,
  currentPage = 1,
  pageSize: propPageSize = 20,
  onFiltersChange,
  onPageChange,
  onSortChange,
  onFrontendSortChange,
  availableFilterOptions = {
    clusters: [],
    datacenters: [],
    concernLabels: [],
    concernCategories: [],
    vmLabels: [],
    groups: [],
    applications: [],
  },
  selectedVMs = new Set<string>(),
  onSelectionChange,
  onFetchAllVmIds,
  onRefreshFilterOptions,
  variant = "overview",
}: UseVMTableLogicParams) {
  const isGroupRowActions = variant === "groups";
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFiltersSnapshot = JSON.stringify(initialFilters ?? {});

  // Track if filter changes come from user interaction (not from URL sync)
  const isUserInteraction = useRef(false);

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
      resolveVisibleColumns({
        variant,
        userSelectedColumns,
      }),
    [variant, userSelectedColumns],
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

  // Cancel deep inspection confirmation (vm id when open, null when closed)
  const [cancelInspectionVmId, setCancelInspectionVmId] = useState<
    string | null
  >(null);
  const openCancelInspectionConfirm = useCallback((vmId: string) => {
    setCancelInspectionVmId(vmId);
  }, []);
  const closeCancelInspectionConfirm = useCallback(() => {
    setCancelInspectionVmId(null);
  }, []);

  // Bulk actions menu
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Exclude / Include from reports modals
  const [isExcludeModalOpen, setIsExcludeModalOpen] = useState(false);
  const [isExcludeLoading, setIsExcludeLoading] = useState(false);
  const [isIncludeModalOpen, setIsIncludeModalOpen] = useState(false);
  const [isIncludeLoading, setIsIncludeLoading] = useState(false);

  const vmByIdCacheRef = useRef(new Map<string, VirtualMachine>());
  const vmById = useMemo(() => {
    const map = new Map(vmByIdCacheRef.current);
    for (const vm of vms) {
      map.set(vm.id, vm);
    }
    vmByIdCacheRef.current = map;
    return map;
  }, [vms]);

  const selectedVmIds = useMemo(() => Array.from(selectedVMs), [selectedVMs]);

  const canRemoveSelectedFromGroup = useMemo(() => {
    if (isGroupRowActions) {
      return selectedVMs.size > 0;
    }
    for (const id of selectedVMs) {
      const vm = vmById.get(id) as VirtualMachineWithGroupItems | undefined;
      if (vm?.groupItems && vm.groupItems.length > 0) {
        return true;
      }
    }
    return false;
  }, [isGroupRowActions, selectedVMs, vmById]);

  const { selectedExcludedIds, selectedIncludedIds } = useMemo(() => {
    const excluded: string[] = [];
    const included: string[] = [];
    for (const id of selectedVMs) {
      const vm = vmById.get(id);
      if (!vm) continue;
      if (vm.migrationExcluded) {
        excluded.push(id);
      } else {
        included.push(id);
      }
    }
    return { selectedExcludedIds: excluded, selectedIncludedIds: included };
  }, [vmById, selectedVMs]);

  // Client-side filter state (applied filters)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialFilters?.statuses ?? EMPTY_STRING_ARRAY,
  );
  const [selectedClusters, setSelectedClusters] = useState<string[]>(
    initialFilters?.clusters ?? EMPTY_STRING_ARRAY,
  );
  const [selectedDatacenters, setSelectedDatacenters] = useState<string[]>(
    initialFilters?.datacenters ?? EMPTY_STRING_ARRAY,
  );
  const [selectedMigrationReadiness, setSelectedMigrationReadiness] = useState<
    string[]
  >(initialFilters?.migrationReadiness ?? EMPTY_STRING_ARRAY);
  const [selectedReportInclusion, setSelectedReportInclusion] = useState<
    string[]
  >(initialFilters?.reportInclusion ?? EMPTY_STRING_ARRAY);
  const [selectedVmLabels, setSelectedVmLabels] = useState<string[]>(
    initialFilters?.vmLabels ?? EMPTY_STRING_ARRAY,
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    initialFilters?.groups ?? EMPTY_STRING_ARRAY,
  );
  const [selectedApplications, setSelectedApplications] = useState<string[]>(
    initialFilters?.applications ?? EMPTY_STRING_ARRAY,
  );
  const [selectedConcernLabels, setSelectedConcernLabels] = useState<string[]>(
    initialFilters?.concernLabels ?? EMPTY_STRING_ARRAY,
  );
  const [selectedConcernCategories, setSelectedConcernCategories] = useState<
    string[]
  >(initialFilters?.concernCategories ?? EMPTY_STRING_ARRAY);
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
  const [cpuUsageRangeFilter, setCpuUsageRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(initialFilters?.cpuUsageRange || null);
  const [ramUsageRangeFilter, setRamUsageRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(initialFilters?.ramUsageRange || null);
  const [diskUsageRangeFilter, setDiskUsageRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(initialFilters?.diskUsageRange || null);

  // Sync local state with initialFilters when they change (e.g., from chart navigation)
  // biome-ignore lint/correctness/useExhaustiveDependencies: snapshot avoids reference-only changes and URL-driven resync loops
  useEffect(() => {
    // Skip if changes come from user interaction
    if (isUserInteraction.current) return;

    // Only sync if we're on the VMs tab
    const currentTab = searchParams.get("tab");
    if (currentTab !== "vms") return;

    syncRangeState(setDiskRangeFilter, initialFilters?.diskRange);
    syncRangeState(setMemoryRangeFilter, initialFilters?.memoryRange);
    syncRangeState(setCpuUsageRangeFilter, initialFilters?.cpuUsageRange);
    syncRangeState(setRamUsageRangeFilter, initialFilters?.ramUsageRange);
    syncRangeState(setDiskUsageRangeFilter, initialFilters?.diskUsageRange);
    syncStringArrayState(setSelectedStatuses, initialFilters?.statuses);
    syncStringArrayState(setSelectedClusters, initialFilters?.clusters);
    syncStringArrayState(setSelectedDatacenters, initialFilters?.datacenters);
    syncStringArrayState(
      setSelectedMigrationReadiness,
      initialFilters?.migrationReadiness,
    );
    syncStringArrayState(
      setSelectedReportInclusion,
      initialFilters?.reportInclusion,
    );
    syncStringArrayState(setSelectedVmLabels, initialFilters?.vmLabels);
    syncStringArrayState(setSelectedGroups, initialFilters?.groups);
    syncStringArrayState(setSelectedApplications, initialFilters?.applications);
    syncStringArrayState(
      setSelectedConcernLabels,
      initialFilters?.concernLabels,
    );
    syncStringArrayState(
      setSelectedConcernCategories,
      initialFilters?.concernCategories,
    );
    setHasIssuesFilter((previous) => {
      const next = initialFilters?.hasIssues || false;
      return previous === next ? previous : next;
    });
    setNoIssuesFilter((previous) => {
      const next = initialFilters?.noIssues || false;
      return previous === next ? previous : next;
    });
    setSearchValue((previous) => {
      const next = initialFilters?.search || "";
      return previous === next ? previous : next;
    });

    if (selectedVMs.size > 0) {
      onSelectionChange?.(new Set());
    }
  }, [initialFiltersSnapshot]);
  // Selection state
  // const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set());

  // Bulk select dropdown state
  const [isBulkSelectOpen, setIsBulkSelectOpen] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);

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
      onFrontendSortChange?.(null);
    }
  }, [sortByColumnKey, isColumnVisible, onFrontendSortChange, onSortChange]);

  useEffect(() => {
    onFrontendSortChange?.(
      sortByColumnKey && !isBackendSortableColumn(sortByColumnKey)
        ? sortByColumnKey
        : null,
    );
  }, [onFrontendSortChange, sortByColumnKey]);

  // Column definitions - filtered by visibility
  const columns = useMemo(
    () =>
      visibleColumns.map((key) => ({
        key,
        label: Columns[key],
        sortable: isSortableColumn(key),
      })),
    [visibleColumns],
  );

  // Use filter options from props (pre-fetched from parent)
  const availableClusters = availableFilterOptions.clusters;
  const availableDatacenters = availableFilterOptions.datacenters;
  const availableConcernLabels = availableFilterOptions.concernLabels;
  const availableConcernCategories = availableFilterOptions.concernCategories;
  const availableVmLabels = availableFilterOptions.vmLabels;
  const availableGroups = availableFilterOptions.groups;
  const availableApplications = availableFilterOptions.applications;

  const applyFilterChange = useCallback(
    (updater: () => void) => {
      isUserInteraction.current = true;
      updater();
      onPageChange?.(1, pageSize);
      onSelectionChange?.(new Set());
    },
    [onPageChange, onSelectionChange, pageSize],
  );

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
        selectedReportInclusion.length > 0 ||
        selectedVmLabels.length > 0 ||
        selectedGroups.length > 0 ||
        selectedApplications.length > 0 ||
        selectedConcernLabels.length > 0 ||
        selectedConcernCategories.length > 0 ||
        hasIssuesFilter ||
        noIssuesFilter ||
        searchValue ||
        diskRangeFilter ||
        memoryRangeFilter ||
        cpuUsageRangeFilter ||
        ramUsageRangeFilter ||
        diskUsageRangeFilter
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
      cpuUsageRange: cpuUsageRangeFilter || undefined,
      ramUsageRange: ramUsageRangeFilter || undefined,
      diskUsageRange: diskUsageRangeFilter || undefined,
      migrationReadiness:
        selectedMigrationReadiness.length > 0
          ? selectedMigrationReadiness
          : undefined,
      reportInclusion:
        selectedReportInclusion.length > 0
          ? selectedReportInclusion
          : undefined,
      vmLabels: selectedVmLabels.length > 0 ? selectedVmLabels : undefined,
      groups: selectedGroups.length > 0 ? selectedGroups : undefined,
      applications:
        selectedApplications.length > 0 ? selectedApplications : undefined,
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
    selectedReportInclusion,
    selectedVmLabels,
    selectedGroups,
    selectedApplications,
    selectedConcernLabels,
    selectedConcernCategories,
    hasIssuesFilter,
    noIssuesFilter,
    searchValue,
    diskRangeFilter,
    memoryRangeFilter,
    cpuUsageRangeFilter,
    ramUsageRangeFilter,
    diskUsageRangeFilter,
    setSearchParams,
    onFiltersChange,
    searchParams.get,
  ]);

  // Build list of applied filters for chip display
  const applyFilterSelection = useCallback(
    (selection: VMTableFilterSelection) => {
      setSelectedStatuses(selection.selectedStatuses);
      setSelectedClusters(selection.selectedClusters);
      setSelectedDatacenters(selection.selectedDatacenters);
      setSelectedMigrationReadiness(selection.selectedMigrationReadiness);
      setSelectedReportInclusion(selection.selectedReportInclusion);
      setSelectedVmLabels(selection.selectedVmLabels);
      setSelectedGroups(selection.selectedGroups);
      setSelectedApplications(selection.selectedApplications);
      setSelectedConcernLabels(selection.selectedConcernLabels);
      setSelectedConcernCategories(selection.selectedConcernCategories);
      setHasIssuesFilter(selection.hasIssuesFilter);
      setNoIssuesFilter(selection.noIssuesFilter);
      setDiskRangeFilter(selection.diskRangeFilter);
      setMemoryRangeFilter(selection.memoryRangeFilter);
      setCpuUsageRangeFilter(selection.cpuUsageRangeFilter);
      setRamUsageRangeFilter(selection.ramUsageRangeFilter);
      setDiskUsageRangeFilter(selection.diskUsageRangeFilter);
    },
    [],
  );

  const showGroupsFilter = VM_TABLE_VARIANT_UI[variant].showGroupsFilter;

  const refreshFilterOptions = useCallback(() => {
    void onRefreshFilterOptions?.();
  }, [onRefreshFilterOptions]);

  const filterAttributes = useMemo(
    () =>
      buildVmTableFilterAttributes({
        searchValue,
        onSearchChange: (value) => {
          applyFilterChange(() => setSearchValue(value));
        },
        selectedConcernCategories,
        onConcernCategoriesChange: (values) => {
          applyFilterChange(() => {
            setSelectedConcernCategories(values);
            setHasIssuesFilter(false);
            setNoIssuesFilter(false);
          });
        },
        selectedConcernLabels,
        onConcernLabelsChange: (values) => {
          applyFilterChange(() => {
            setSelectedConcernLabels(values);
            setHasIssuesFilter(false);
            setNoIssuesFilter(false);
          });
        },
        selectedDatacenters,
        onDatacentersChange: (values) => {
          applyFilterChange(() => setSelectedDatacenters(values));
        },
        selectedClusters,
        onClustersChange: (values) => {
          applyFilterChange(() => setSelectedClusters(values));
        },
        diskRangeFilter,
        onDiskRangeChange: (value) => {
          applyFilterChange(() => setDiskRangeFilter(value));
        },
        memoryRangeFilter,
        onMemoryRangeChange: (value) => {
          applyFilterChange(() => setMemoryRangeFilter(value));
        },
        cpuUsageRangeFilter,
        onCpuUsageRangeChange: (value) => {
          applyFilterChange(() => setCpuUsageRangeFilter(value));
        },
        ramUsageRangeFilter,
        onRamUsageRangeChange: (value) => {
          applyFilterChange(() => setRamUsageRangeFilter(value));
        },
        diskUsageRangeFilter,
        onDiskUsageRangeChange: (value) => {
          applyFilterChange(() => setDiskUsageRangeFilter(value));
        },
        selectedStatuses,
        onStatusesChange: (values) => {
          applyFilterChange(() => setSelectedStatuses(values));
        },
        selectedMigrationReadiness,
        onMigrationReadinessChange: (values) => {
          applyFilterChange(() => setSelectedMigrationReadiness(values));
        },
        selectedReportInclusion,
        onReportInclusionChange: (values) => {
          applyFilterChange(() => setSelectedReportInclusion(values));
        },
        selectedVmLabels,
        onVmLabelsChange: (values) => {
          applyFilterChange(() => setSelectedVmLabels(values));
        },
        selectedGroups,
        onGroupsChange: (values) => {
          applyFilterChange(() => setSelectedGroups(values));
        },
        selectedApplications,
        onApplicationsChange: (values) => {
          applyFilterChange(() => setSelectedApplications(values));
        },
        hasIssuesFilter,
        noIssuesFilter,
        onIssuesFilterChange: (hasIssues, noIssues) => {
          applyFilterChange(() => {
            setHasIssuesFilter(hasIssues);
            setNoIssuesFilter(noIssues);
            if (hasIssues || noIssues) {
              setSelectedConcernCategories([]);
              setSelectedConcernLabels([]);
            }
          });
        },
        availableConcernCategories,
        availableConcernLabels,
        availableDatacenters,
        availableClusters,
        availableVmLabels,
        availableGroups,
        availableApplications,
        showGroupsFilter,
        onCheckboxValueOpen: refreshFilterOptions,
      }),
    [
      applyFilterChange,
      availableClusters,
      availableConcernCategories,
      availableConcernLabels,
      availableDatacenters,
      availableGroups,
      availableApplications,
      availableVmLabels,
      cpuUsageRangeFilter,
      diskRangeFilter,
      diskUsageRangeFilter,
      hasIssuesFilter,
      memoryRangeFilter,
      noIssuesFilter,
      ramUsageRangeFilter,
      refreshFilterOptions,
      searchValue,
      selectedClusters,
      selectedConcernCategories,
      selectedConcernLabels,
      selectedDatacenters,
      selectedGroups,
      selectedApplications,
      selectedMigrationReadiness,
      selectedReportInclusion,
      selectedStatuses,
      selectedVmLabels,
      showGroupsFilter,
    ],
  );

  // No client-side filtering - handled by backend
  // VMs are already filtered, sorted, and paginated by the backend

  // Backend supports sorting for these columns only
  const backendFieldMap: Record<BackendSortableColumn, string> = {
    name: "name",
    vCenterState: "vCenterState",
    cluster: "cluster",
    cpuUsage: "cpuUsage",
    ramUsage: "ramUsage",
    diskUsage: "diskUsage",
    diskSize: "diskSize",
    memory: "memory",
    issues: "issues",
  };

  // Apply client-side sort for frontend-sortable columns; all other columns use backend sort.
  // Skip reordering while inspection is active so rows don't jump as statuses change.
  const displayVMs = useMemo(() => {
    if (sortByColumnKey === null || isBackendSortableColumn(sortByColumnKey)) {
      return vms;
    }
    const sortFn =
      FRONTEND_SORT_METHODS[sortByColumnKey as FrontendSortableColumn];
    if (!sortFn) {
      return vms;
    }
    const sorted = [...vms].sort((a, b) => {
      const diff = sortFn(a) - sortFn(b);
      return activeSortDirection === "asc" ? diff : -diff;
    });
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [vms, sortByColumnKey, activeSortDirection, page, pageSize]);

  const totalMatchingCount = useMemo(() => {
    if (sortByColumnKey && !isBackendSortableColumn(sortByColumnKey)) {
      return vms.length;
    }
    return totalVMs ?? vms.length;
  }, [sortByColumnKey, totalVMs, vms.length]);

  const currentFilters = useMemo((): VMFilters => {
    return {
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      clusters: selectedClusters.length > 0 ? selectedClusters : undefined,
      datacenters:
        selectedDatacenters.length > 0 ? selectedDatacenters : undefined,
      hasIssues: hasIssuesFilter || undefined,
      noIssues: noIssuesFilter || undefined,
      search: searchValue || undefined,
      diskRange: diskRangeFilter || undefined,
      memoryRange: memoryRangeFilter || undefined,
      cpuUsageRange: cpuUsageRangeFilter || undefined,
      ramUsageRange: ramUsageRangeFilter || undefined,
      diskUsageRange: diskUsageRangeFilter || undefined,
      migrationReadiness:
        selectedMigrationReadiness.length > 0
          ? selectedMigrationReadiness
          : undefined,
      reportInclusion:
        selectedReportInclusion.length > 0
          ? selectedReportInclusion
          : undefined,
      vmLabels: selectedVmLabels.length > 0 ? selectedVmLabels : undefined,
      groups: selectedGroups.length > 0 ? selectedGroups : undefined,
      applications:
        selectedApplications.length > 0 ? selectedApplications : undefined,
      concernLabels:
        selectedConcernLabels.length > 0 ? selectedConcernLabels : undefined,
      concernCategories:
        selectedConcernCategories.length > 0
          ? selectedConcernCategories
          : undefined,
    };
  }, [
    selectedStatuses,
    selectedClusters,
    selectedDatacenters,
    hasIssuesFilter,
    noIssuesFilter,
    searchValue,
    diskRangeFilter,
    memoryRangeFilter,
    cpuUsageRangeFilter,
    ramUsageRangeFilter,
    diskUsageRangeFilter,
    selectedMigrationReadiness,
    selectedReportInclusion,
    selectedVmLabels,
    selectedGroups,
    selectedApplications,
    selectedConcernLabels,
    selectedConcernCategories,
  ]);

  const pageVmIds = useMemo(() => displayVMs.map((vm) => vm.id), [displayVMs]);

  const allPageSelected =
    pageVmIds.length > 0 && pageVmIds.every((id) => selectedVMs.has(id));

  const handleSelectAllMatching = useCallback(async () => {
    if (!onFetchAllVmIds || !onSelectionChange) {
      return;
    }
    setIsSelectingAll(true);
    try {
      const ids = await onFetchAllVmIds(currentFilters);
      onSelectionChange(new Set(ids));
    } catch (err) {
      console.error("Error selecting all VMs:", err);
    } finally {
      setIsSelectingAll(false);
      setIsBulkSelectOpen(false);
    }
  }, [currentFilters, onFetchAllVmIds, onSelectionChange]);

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

      if (isBackendSortableColumn(columnKey)) {
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

  // Clear all filters
  const clearAllFilters = () => {
    applyFilterChange(() => {
      applyFilterSelection(EMPTY_VM_TABLE_FILTER_SELECTION);
      setSearchValue("");
    });
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
  return {
    page,
    pageSize,
    isColumnSelectOpen,
    setIsColumnSelectOpen,
    visibleColumns,
    isColumnVisible,
    toggleColumn,
    filterAttributes,
    clearAllFilters,
    cancelInspectionVmId,
    openCancelInspectionConfirm,
    closeCancelInspectionConfirm,
    isActionsMenuOpen,
    setIsActionsMenuOpen,
    isExcludeModalOpen,
    setIsExcludeModalOpen,
    isExcludeLoading,
    setIsExcludeLoading,
    isIncludeModalOpen,
    setIsIncludeModalOpen,
    isIncludeLoading,
    setIsIncludeLoading,
    vmById,
    selectedVmIds,
    canRemoveSelectedFromGroup,
    selectedExcludedIds,
    selectedIncludedIds,
    displayVMs,
    pageVmIds,
    allPageSelected,
    totalMatchingCount,
    handleSelectAllMatching,
    getSortParams,
    onSelectVM,
    columns,
    isBulkSelectOpen,
    setIsBulkSelectOpen,
    isSelectingAll,
    openActionMenuId,
    setOpenActionMenuId,
  };
}

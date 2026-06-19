import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type { ThProps } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useLocalStorage from "../../../hooks/useLocalStorage";
import { filtersToSearchParams, type VMFilters } from "./vmFilters";
import type { VirtualMachineWithGroupItems } from "./vmGroupMembership";
import {
  buildAppliedFilters,
  EMPTY_VM_TABLE_FILTER_SELECTION,
  removeFilterFromSelection,
  type VMTableFilterSelection,
} from "./vmTableFilterLogic";
import {
  type BackendSortableColumn,
  type ColumnKey,
  Columns,
  DEFAULT_VISIBLE_COLUMNS,
  diskSizeRanges,
  FRONTEND_SORT_METHODS,
  type FrontendSortableColumn,
  isBackendSortableColumn,
  isSortableColumn,
  MANDATORY_COLUMNS,
  memorySizeRanges,
  resolveVisibleColumns,
  utilizationPercentRanges,
  VISIBLE_COLUMNS_KEY,
  VISIBLE_COLUMNS_VERSION,
} from "./vmTableShared";
import type { UseVMTableLogicParams } from "./vmTableTypes";

export function useVMTableLogic({
  vms,
  initialFilters,
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
    vmLabels: [],
  },
  selectedVMs = new Set<string>(),
  onSelectionChange,
  onFetchAllVmIds,
  showExcludedVMs = true,
  variant = "overview",
}: UseVMTableLogicParams) {
  const isGroupRowActions = variant === "groups";
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

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isConcernSelectOpen, setIsConcernSelectOpen] = useState(false);
  const [isVmLabelSelectOpen, setIsVmLabelSelectOpen] = useState(false);

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
  const [selectedVmLabels, setSelectedVmLabels] = useState<string[]>(
    initialFilters?.vmLabels || [],
  );
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
  const [tempSelectedVmLabels, setTempSelectedVmLabels] = useState<string[]>(
    [],
  );
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
  const [tempCpuUsageRangeFilter, setTempCpuUsageRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(null);
  const [tempRamUsageRangeFilter, setTempRamUsageRangeFilter] = useState<{
    min: number;
    max?: number;
  } | null>(null);
  const [tempDiskUsageRangeFilter, setTempDiskUsageRangeFilter] = useState<{
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
    setCpuUsageRangeFilter(initialFilters?.cpuUsageRange || null);
    setRamUsageRangeFilter(initialFilters?.ramUsageRange || null);
    setDiskUsageRangeFilter(initialFilters?.diskUsageRange || null);
    setSelectedStatuses(initialFilters?.statuses || []);
    setSelectedClusters(initialFilters?.clusters || []);
    setSelectedDatacenters(initialFilters?.datacenters || []);
    setSelectedMigrationReadiness(initialFilters?.migrationReadiness || []);
    setSelectedVmLabels(initialFilters?.vmLabels || []);
    setSelectedConcernLabels(initialFilters?.concernLabels || []);
    setSelectedConcernCategories(initialFilters?.concernCategories || []);
    setHasIssuesFilter(initialFilters?.hasIssues || false);
    setNoIssuesFilter(initialFilters?.noIssues || false);
    setSearchValue(initialFilters?.search || "");
  }, [initialFilters, searchParams]);
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
    }
  }, [sortByColumnKey, isColumnVisible, onSortChange]);

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
        selectedVmLabels.length > 0 ||
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
      vmLabels: selectedVmLabels.length > 0 ? selectedVmLabels : undefined,
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
    selectedVmLabels,
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
    searchParams,
    setSearchParams,
    onFiltersChange,
  ]);

  // Build list of applied filters for chip display
  const filterSelection = useMemo(
    (): VMTableFilterSelection => ({
      selectedStatuses,
      selectedClusters,
      selectedDatacenters,
      selectedMigrationReadiness,
      selectedVmLabels,
      selectedConcernLabels,
      selectedConcernCategories,
      hasIssuesFilter,
      noIssuesFilter,
      diskRangeFilter,
      memoryRangeFilter,
      cpuUsageRangeFilter,
      ramUsageRangeFilter,
      diskUsageRangeFilter,
    }),
    [
      selectedStatuses,
      selectedClusters,
      selectedDatacenters,
      selectedMigrationReadiness,
      selectedVmLabels,
      selectedConcernLabels,
      selectedConcernCategories,
      hasIssuesFilter,
      noIssuesFilter,
      diskRangeFilter,
      memoryRangeFilter,
      cpuUsageRangeFilter,
      ramUsageRangeFilter,
      diskUsageRangeFilter,
    ],
  );

  const appliedFilters = useMemo(
    () => buildAppliedFilters(filterSelection),
    [filterSelection],
  );

  const applyFilterSelection = useCallback(
    (selection: VMTableFilterSelection) => {
      setSelectedStatuses(selection.selectedStatuses);
      setSelectedClusters(selection.selectedClusters);
      setSelectedDatacenters(selection.selectedDatacenters);
      setSelectedMigrationReadiness(selection.selectedMigrationReadiness);
      setSelectedVmLabels(selection.selectedVmLabels);
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
    if (sortByColumnKey === null || isBackendSortableColumn(sortByColumnKey))
      return vms;
    const sortFn =
      FRONTEND_SORT_METHODS[sortByColumnKey as FrontendSortableColumn];
    if (!sortFn) return vms;
    return [...vms].sort((a, b) => {
      const diff = sortFn(a) - sortFn(b);
      return activeSortDirection === "asc" ? diff : -diff;
    });
  }, [vms, sortByColumnKey, activeSortDirection]);

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
      vmLabels: selectedVmLabels.length > 0 ? selectedVmLabels : undefined,
      concernLabels:
        selectedConcernLabels.length > 0 ? selectedConcernLabels : undefined,
      concernCategories:
        selectedConcernCategories.length > 0
          ? selectedConcernCategories
          : undefined,
      showExcludedVMs,
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
    selectedVmLabels,
    selectedConcernLabels,
    selectedConcernCategories,
    showExcludedVMs,
  ]);

  const pageVmIds = useMemo(() => displayVMs.map((vm) => vm.id), [displayVMs]);

  const allPageSelected =
    pageVmIds.length > 0 && pageVmIds.every((id) => selectedVMs.has(id));

  const totalMatchingCount = totalVMs ?? vms.length;

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

  // Apply filters from modal
  const applyFilters = () => {
    isUserInteraction.current = true;
    setSelectedStatuses(tempSelectedStatuses);
    setSelectedClusters(tempSelectedClusters);
    setSelectedDatacenters(tempSelectedDatacenters);
    setSelectedMigrationReadiness(tempSelectedMigrationReadiness);
    setSelectedVmLabels(tempSelectedVmLabels);
    setSelectedConcernLabels(tempSelectedConcernLabels);
    setSelectedConcernCategories(tempSelectedConcernCategories);
    setHasIssuesFilter(tempHasIssuesFilter);
    setNoIssuesFilter(tempNoIssuesFilter);
    setDiskRangeFilter(tempDiskRangeFilter);
    setMemoryRangeFilter(tempMemoryRangeFilter);
    setCpuUsageRangeFilter(tempCpuUsageRangeFilter);
    setRamUsageRangeFilter(tempRamUsageRangeFilter);
    setDiskUsageRangeFilter(tempDiskUsageRangeFilter);
    onPageChange?.(1, pageSize); // Reset to page 1
    setIsFilterModalOpen(false);
    setIsConcernSelectOpen(false);
    setIsVmLabelSelectOpen(false);
    // Reset temporary filters after applying
    resetTempFilters();
  };

  // Cancel filter modal
  const cancelFilterModal = () => {
    setIsFilterModalOpen(false);
    setIsConcernSelectOpen(false);
    setIsVmLabelSelectOpen(false);
    // Reset temporary filters when canceling
    resetTempFilters();
  };

  // Reset temporary filters to empty state
  const resetTempFilters = () => {
    setTempSelectedStatuses([]);
    setTempSelectedClusters([]);
    setTempSelectedDatacenters([]);
    setTempSelectedMigrationReadiness([]);
    setTempSelectedVmLabels([]);
    setTempSelectedConcernLabels([]);
    setTempSelectedConcernCategories([]);
    setTempHasIssuesFilter(false);
    setTempNoIssuesFilter(false);
    setTempDiskRangeFilter(null);
    setTempMemoryRangeFilter(null);
    setTempCpuUsageRangeFilter(null);
    setTempRamUsageRangeFilter(null);
    setTempDiskUsageRangeFilter(null);
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
      setTempSelectedVmLabels(selectedVmLabels);
      setTempSelectedConcernLabels(selectedConcernLabels);
      setTempSelectedConcernCategories(selectedConcernCategories);
      setTempHasIssuesFilter(hasIssuesFilter);
      setTempNoIssuesFilter(noIssuesFilter);
      setTempDiskRangeFilter(diskRangeFilter);
      setTempMemoryRangeFilter(memoryRangeFilter);
      setTempCpuUsageRangeFilter(cpuUsageRangeFilter);
      setTempRamUsageRangeFilter(ramUsageRangeFilter);
      setTempDiskUsageRangeFilter(diskUsageRangeFilter);
    }
  }, [
    isFilterModalOpen,
    selectedStatuses,
    selectedClusters,
    selectedDatacenters,
    selectedMigrationReadiness,
    selectedVmLabels,
    selectedConcernLabels,
    selectedConcernCategories,
    hasIssuesFilter,
    noIssuesFilter,
    diskRangeFilter,
    memoryRangeFilter,
    cpuUsageRangeFilter,
    ramUsageRangeFilter,
    diskUsageRangeFilter,
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

  const toggleTempVmLabel = (label: string) => {
    setTempSelectedVmLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
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

  const toggleTempUtilizationRange = (
    index: number,
    currentFilter: { min: number; max?: number } | null,
    setFilter: (value: { min: number; max?: number } | null) => void,
  ) => {
    const range = utilizationPercentRanges[index];
    const isSameRange =
      currentFilter?.min === range.min && currentFilter?.max === range.max;
    setFilter(isSameRange ? null : { min: range.min, max: range.max });
  };

  const toggleTempCpuUsageRange = (index: number) => {
    toggleTempUtilizationRange(
      index,
      tempCpuUsageRangeFilter,
      setTempCpuUsageRangeFilter,
    );
  };

  const toggleTempRamUsageRange = (index: number) => {
    toggleTempUtilizationRange(
      index,
      tempRamUsageRangeFilter,
      setTempRamUsageRangeFilter,
    );
  };

  const toggleTempDiskUsageRange = (index: number) => {
    toggleTempUtilizationRange(
      index,
      tempDiskUsageRangeFilter,
      setTempDiskUsageRangeFilter,
    );
  };

  // Remove individual filter
  const removeFilter = (filterKey: string) => {
    isUserInteraction.current = true;
    applyFilterSelection(removeFilterFromSelection(filterSelection, filterKey));
    onPageChange?.(1, pageSize);
  };

  // Clear all filters
  const clearAllFilters = () => {
    isUserInteraction.current = true;
    applyFilterSelection(EMPTY_VM_TABLE_FILTER_SELECTION);
    setSearchValue("");
    onPageChange?.(1, pageSize);
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
  return {
    page,
    pageSize,
    isColumnSelectOpen,
    setIsColumnSelectOpen,
    visibleColumns,
    isColumnVisible,
    toggleColumn,
    searchValue,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isConcernSelectOpen,
    setIsConcernSelectOpen,
    isVmLabelSelectOpen,
    setIsVmLabelSelectOpen,
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
    appliedFilters,
    displayVMs,
    pageVmIds,
    allPageSelected,
    totalMatchingCount,
    handleSelectAllMatching,
    getSortParams,
    applyFilters,
    cancelFilterModal,
    tempSelectedStatuses,
    tempSelectedClusters,
    tempSelectedDatacenters,
    tempSelectedMigrationReadiness,
    tempSelectedVmLabels,
    tempSelectedConcernLabels,
    tempSelectedConcernCategories,
    tempHasIssuesFilter,
    setTempHasIssuesFilter,
    tempNoIssuesFilter,
    setTempNoIssuesFilter,
    tempDiskRangeFilter,
    tempMemoryRangeFilter,
    tempCpuUsageRangeFilter,
    tempRamUsageRangeFilter,
    tempDiskUsageRangeFilter,
    toggleTempStatus,
    toggleTempCluster,
    toggleTempDatacenter,
    toggleTempMigrationReadiness,
    toggleTempConcernLabel,
    toggleTempVmLabel,
    toggleTempConcernCategory,
    toggleTempDiskRange,
    toggleTempMemoryRange,
    toggleTempCpuUsageRange,
    toggleTempRamUsageRange,
    toggleTempDiskUsageRange,
    removeFilter,
    clearAllFilters,
    handleSearchChange,
    handleSearchClear,
    onSelectVM,
    columns,
    availableClusters,
    availableDatacenters,
    availableConcernLabels,
    availableConcernCategories,
    availableVmLabels,
    isBulkSelectOpen,
    setIsBulkSelectOpen,
    isSelectingAll,
    openActionMenuId,
    setOpenActionMenuId,
  };
}

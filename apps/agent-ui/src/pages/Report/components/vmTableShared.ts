import { css } from "@emotion/css";
import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { deepInspectionSort } from "./vmSort";

export type ColumnKey =
  | "name"
  | "labels"
  | "groups"
  | "vCenterState"
  | "id"
  | "cpuUsage"
  | "ramUsage"
  | "diskUsage"
  | "datacenter"
  | "cluster"
  | "diskSize"
  | "memory"
  | "issues"
  | "migratable"
  | "deepInspection";

export const BACKEND_SORTABLE_COLUMNS = [
  "name",
  "vCenterState",
  "cluster",
  "cpuUsage",
  "ramUsage",
  "diskUsage",
  "diskSize",
  "memory",
  "issues",
] as const;

export const FRONTEND_SORTABLE_COLUMNS = ["deepInspection"] as const;

export type BackendSortableColumn = (typeof BACKEND_SORTABLE_COLUMNS)[number];
export type FrontendSortableColumn = (typeof FRONTEND_SORTABLE_COLUMNS)[number];
export type SortableColumn = BackendSortableColumn | FrontendSortableColumn;

export const Columns: Record<ColumnKey, string> = {
  name: "Name",
  labels: "Labels",
  groups: "Groups",
  vCenterState: "Status",
  migratable: "Migration Readiness",
  id: "ID",
  cpuUsage: "CPU usage",
  ramUsage: "RAM usage",
  diskUsage: "Disk usage",
  datacenter: "Data center",
  cluster: "Cluster",
  diskSize: "Disk size",
  memory: "Memory size",
  issues: "Issues",
  deepInspection: "Deep inspection",
};

export const ALL_COLUMN_KEYS = Object.keys(Columns) as ColumnKey[];
export const MANDATORY_COLUMNS: ColumnKey[] = ["name"];
export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [...ALL_COLUMN_KEYS];

export const COMPACT_VISIBLE_COLUMNS: ColumnKey[] = [
  "name",
  "labels",
  "vCenterState",
  "migratable",
  "cluster",
];

export const VISIBLE_COLUMNS_KEY = "vmTable.visibleColumns";
export const VISIBLE_COLUMNS_VERSION = 7;

export const isSortableColumn = (key: ColumnKey): key is SortableColumn =>
  (BACKEND_SORTABLE_COLUMNS as readonly ColumnKey[]).includes(key) ||
  (FRONTEND_SORTABLE_COLUMNS as readonly ColumnKey[]).includes(key);

export const isBackendSortableColumn = (
  key: ColumnKey | null,
): key is BackendSortableColumn =>
  key !== null &&
  (BACKEND_SORTABLE_COLUMNS as readonly ColumnKey[]).includes(key);

export const utilizationPercentRanges = [
  { label: "0-25%", min: 0, max: 25 },
  { label: "26-50%", min: 26, max: 50 },
  { label: "51-75%", min: 51, max: 75 },
  { label: "76-100%", min: 76, max: 100 },
];

export const getColumnModifier = (key: ColumnKey) => {
  if (
    key === "issues" ||
    key === "migratable" ||
    key === "cpuUsage" ||
    key === "ramUsage" ||
    key === "diskUsage"
  ) {
    return "fitContent";
  }
  if (key === "labels") {
    return "wrap";
  }
  return "nowrap";
};

export const statusLabels: Record<string, string> = {
  poweredOn: "Powered on",
  poweredOff: "Powered off",
  suspended: "Suspended",
};

const MB_IN_GIB = 1024;
const MB_IN_TIB = 1024 * 1024;

export const diskSizeRanges = [
  { label: "0-100GiB", min: 0, max: 100 * MB_IN_GIB },
  { label: "100-500GiB", min: 100 * MB_IN_GIB, max: 500 * MB_IN_GIB },
  { label: "500GiB-1TiB", min: 500 * MB_IN_GIB, max: MB_IN_TIB },
  { label: "1-2TiB", min: MB_IN_TIB, max: 2 * MB_IN_TIB },
  { label: "2-5TiB", min: 2 * MB_IN_TIB, max: 5 * MB_IN_TIB },
];

const legacyDiskSizeRanges = [
  { label: "0-10 TB", min: 0, max: 10 * MB_IN_TIB },
  { label: "11-20 TB", min: 10 * MB_IN_TIB + 1, max: 20 * MB_IN_TIB },
  { label: "21-50 TB", min: 20 * MB_IN_TIB + 1, max: 50 * MB_IN_TIB },
  { label: "50+ TB", min: 50 * MB_IN_TIB + 1, max: undefined },
];

function sizeValueToMB(value: string, unit: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return Number.NaN;
  }

  switch (unit.toLowerCase()) {
    case "gib":
    case "gb":
      return amount * MB_IN_GIB;
    case "tib":
    case "tb":
      return amount * MB_IN_TIB;
    case "mib":
    case "mb":
      return amount;
    default:
      return Number.NaN;
  }
}

/** Parses inventory disk tier labels (GiB/TiB or legacy TB buckets) into MB ranges. */
export function parseDiskTierLabelToRange(
  label: string,
): { min: number; max?: number } | undefined {
  const normalized = label.trim();
  if (!normalized) {
    return undefined;
  }

  const predefined =
    diskSizeRanges.find((range) => range.label === normalized) ??
    legacyDiskSizeRanges.find(
      (range) =>
        range.label === normalized ||
        (normalized === "> 50 TB" && range.label === "50+ TB"),
    );
  if (predefined) {
    return { min: predefined.min, max: predefined.max };
  }

  const mixedUnitRange =
    /^(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)\s*-\s*(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)$/i.exec(
      normalized,
    );
  if (mixedUnitRange) {
    const min = sizeValueToMB(mixedUnitRange[1], mixedUnitRange[2]);
    const max = sizeValueToMB(mixedUnitRange[3], mixedUnitRange[4]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.floor(min), max: Math.floor(max) };
    }
  }

  const singleUnitRange =
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)$/i.exec(
      normalized,
    );
  if (singleUnitRange) {
    const min = sizeValueToMB(singleUnitRange[1], singleUnitRange[3]);
    const max = sizeValueToMB(singleUnitRange[2], singleUnitRange[3]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.floor(min), max: Math.floor(max) };
    }
  }

  const openEndedRange =
    /^(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)?\s*\+$/i.exec(normalized);
  if (openEndedRange) {
    const unit = openEndedRange[2] || "TB";
    const min = sizeValueToMB(openEndedRange[1], unit);
    if (Number.isFinite(min)) {
      const minMB = Math.floor(min);
      return { min: minMB > 0 ? minMB + 1 : minMB, max: undefined };
    }
  }

  return undefined;
}

export const memorySizeRanges = [
  { label: "0-4 GB", min: 0, max: 4 * 1024 },
  { label: "5-16 GB", min: 4 * 1024 + 1, max: 16 * 1024 },
  { label: "17-32 GB", min: 16 * 1024 + 1, max: 32 * 1024 },
  { label: "33-64 GB", min: 32 * 1024 + 1, max: 64 * 1024 },
  { label: "65-128 GB", min: 64 * 1024 + 1, max: 128 * 1024 },
  { label: "129-256 GB", min: 128 * 1024 + 1, max: 256 * 1024 },
  { label: "256+ GB", min: 256 * 1024 + 1, max: undefined },
];

/** Parses inventory memory tier labels into MB ranges for VM filtering. */
export function parseMemoryTierLabelToRange(
  label: string,
): { min: number; max?: number } | undefined {
  const normalized = label.trim();
  if (!normalized) {
    return undefined;
  }

  const labelVariants = [
    normalized,
    /gb$/i.test(normalized) ? normalized : `${normalized} GB`,
    normalized.replace(/\s+GB$/i, ""),
  ];

  for (const variant of labelVariants) {
    const range = memorySizeRanges.find((entry) => entry.label === variant);
    if (range) {
      return { min: range.min, max: range.max };
    }
  }

  const openEnded = /^(\d+(?:\.\d+)?)\s*\+$/i.exec(
    normalized.replace(/\s+GB$/i, ""),
  );
  if (openEnded) {
    const minGb = Number.parseInt(openEnded[1], 10);
    if (Number.isFinite(minGb)) {
      return { min: minGb * 1024 + 1, max: undefined };
    }
  }

  const bounded = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/i.exec(
    normalized.replace(/\s+GB$/i, ""),
  );
  if (bounded) {
    const minGb = Number.parseInt(bounded[1], 10);
    const maxGb = Number.parseInt(bounded[2], 10);
    if (Number.isFinite(minGb) && Number.isFinite(maxGb)) {
      return {
        min: minGb * 1024,
        max: maxGb * 1024,
      };
    }
  }

  return undefined;
}

const MB_IN_GB = 1024;
const MB_IN_TB = 1024 * 1024;

type FrontendSortFunction = (vm: VirtualMachine) => number;

export const FRONTEND_SORT_METHODS: Record<
  FrontendSortableColumn,
  FrontendSortFunction
> = {
  deepInspection: deepInspectionSort,
};

export const formatDiskSize = (sizeInMB: number): string => {
  if (sizeInMB >= MB_IN_TB) {
    const sizeInTB = sizeInMB / MB_IN_TB;
    return `${sizeInTB.toFixed(sizeInTB % 1 === 0 ? 0 : 2)} TB`;
  }
  const sizeInGB = sizeInMB / MB_IN_GB;
  return `${sizeInGB.toFixed(sizeInGB % 1 === 0 ? 0 : 2)} GB`;
};

export const formatMemorySize = (sizeInMB: number): string => {
  const sizeInGB = sizeInMB / MB_IN_GB;
  return `${sizeInGB.toFixed(sizeInGB % 1 === 0 ? 0 : 2)} GB`;
};

export interface AppliedFilter {
  category: string;
  label: string;
  key: string;
}

/** Keeps the filters panel scrollable inside modals and short viewports. */
export const FILTER_DROPDOWN_MAX_HEIGHT = "min(70vh, calc(100vh - 12rem))";

export const filterStyles = {
  dropdownContent: css`
    padding: 24px;
    max-width: 95vw;
    width: fit-content;
  `,
  dropdownContentCompact: css`
    padding: 16px;
    max-width: 95vw;
    width: fit-content;
  `,
  filtersContent: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  `,
  filtersContentCompact: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  concernsColumn: css`
    max-height: 400px;
    overflow-y: auto;
  `,
  concernSelect: css`
    width: 100%;
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

export const vmTableStyles = {
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

export type VMTableVariant = "overview" | "groups" | "compact";

export type VMTableVariantUI = {
  showManageColumns: boolean;
  hideToolbarActions: boolean;
  disableVmNavigation: boolean;
  defaultColumnsKeys: ColumnKey[];
};

export const VM_TABLE_VARIANT_UI: Record<VMTableVariant, VMTableVariantUI> = {
  overview: {
    showManageColumns: true,
    hideToolbarActions: false,
    disableVmNavigation: false,
    defaultColumnsKeys: [...ALL_COLUMN_KEYS],
  },
  groups: {
    showManageColumns: true,
    hideToolbarActions: false,
    disableVmNavigation: false,
    defaultColumnsKeys: ALL_COLUMN_KEYS.filter((k) => k !== "groups"),
  },
  compact: {
    showManageColumns: false,
    hideToolbarActions: true,
    disableVmNavigation: true,
    defaultColumnsKeys: [...COMPACT_VISIBLE_COLUMNS],
  },
};

export function resolveVisibleColumns({
  variant,
  userSelectedColumns,
}: {
  variant: VMTableVariant;
  userSelectedColumns: ColumnKey[];
}): ColumnKey[] {
  if (variant === "compact") return [...COMPACT_VISIBLE_COLUMNS];

  const selectedSet = new Set([
    ...userSelectedColumns.filter((key) => ALL_COLUMN_KEYS.includes(key)),
    ...MANDATORY_COLUMNS,
  ]);

  // Maintain the order defined in ALL_COLUMN_KEYS
  const baseColumns = ALL_COLUMN_KEYS.filter((key) => selectedSet.has(key));

  if (variant === "groups") return baseColumns.filter((k) => k !== "groups");

  return baseColumns;
}

export type ToggleableColumnKey =
  | "expected"
  | "best"
  | "worst"
  | "samples"
  | "mean"
  | "median"
  | "minMax"
  | "stddev"
  | "ci95";

export const TOGGLEABLE_COLUMNS: Record<ToggleableColumnKey, string> = {
  expected: "Expected (1 TB)",
  best: "Best",
  worst: "Worst",
  samples: "Samples",
  mean: "Mean MB/s",
  median: "Median",
  minMax: "Min / max",
  stddev: "Std dev",
  ci95: "95% CI (MB/s)",
};

export const ALL_TOGGLEABLE_COLUMN_KEYS = Object.keys(
  TOGGLEABLE_COLUMNS,
) as ToggleableColumnKey[];

export const DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS: ToggleableColumnKey[] = [
  ...ALL_TOGGLEABLE_COLUMN_KEYS,
];

/** Fixed columns always shown (not in Manage columns). */
export const FIXED_COLUMN_COUNT = 5;

export const VISIBLE_COLUMNS_KEY = "storageOffload.visibleColumns";
export const VISIBLE_COLUMNS_VERSION = 1;

export function isToggleableColumnVisible(
  key: ToggleableColumnKey,
  visibleColumns: ToggleableColumnKey[],
): boolean {
  return visibleColumns.includes(key);
}

export function toggleToggleableColumn(
  key: ToggleableColumnKey,
  visibleColumns: ToggleableColumnKey[],
): ToggleableColumnKey[] {
  return visibleColumns.includes(key)
    ? visibleColumns.filter((k) => k !== key)
    : [...visibleColumns, key];
}

export function totalColumnCount(
  visibleColumns: ToggleableColumnKey[],
): number {
  return FIXED_COLUMN_COUNT + visibleColumns.length;
}

import {
  ALL_COLUMN_KEYS,
  COMPACT_VISIBLE_COLUMNS,
  type ColumnKey,
  MANDATORY_COLUMNS,
} from "./vmTableShared";

export type VMTableVariant = "overview" | "compact";

export type VMTableVariantUI = {
  showManageColumns: boolean;
  hideToolbarActions: boolean;
  disableVmNavigation: boolean;
  groupsDisplay: "labels" | "text";
};

export const VM_TABLE_VARIANT_UI: Record<VMTableVariant, VMTableVariantUI> = {
  overview: {
    showManageColumns: true,
    hideToolbarActions: false,
    disableVmNavigation: false,
    groupsDisplay: "text",
  },
  compact: {
    showManageColumns: false,
    hideToolbarActions: true,
    disableVmNavigation: true,
    groupsDisplay: "labels",
  },
};

export function resolveVisibleColumns({
  variant,
  userSelectedColumns,
  showGroupsColumn,
}: {
  variant: VMTableVariant;
  userSelectedColumns: ColumnKey[];
  showGroupsColumn: boolean;
}): ColumnKey[] {
  const baseColumns =
    variant === "compact"
      ? [...COMPACT_VISIBLE_COLUMNS]
      : Array.from(
          new Set([
            ...userSelectedColumns.filter((key) =>
              ALL_COLUMN_KEYS.includes(key),
            ),
            ...MANDATORY_COLUMNS,
          ]),
        );

  if (showGroupsColumn && !baseColumns.includes("groups")) {
    baseColumns.push("groups");
  }

  return baseColumns;
}

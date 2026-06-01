import { describe, expect, it } from "vitest";
import {
  type ALL_COLUMN_KEYS,
  COMPACT_VISIBLE_COLUMNS,
  MANDATORY_COLUMNS,
} from "./vmTableShared";
import { resolveVisibleColumns, VM_TABLE_VARIANT_UI } from "./vmTableVariants";

describe("vmTableVariants", () => {
  it("compact variant disables overview-only UI", () => {
    expect(VM_TABLE_VARIANT_UI.compact).toEqual({
      showManageColumns: false,
      hideToolbarActions: true,
      disableVmNavigation: true,
      groupsDisplay: "labels",
    });
  });

  it("overview variant uses comma-separated groups and full toolbar", () => {
    expect(VM_TABLE_VARIANT_UI.overview.groupsDisplay).toBe("text");
    expect(VM_TABLE_VARIANT_UI.overview.showManageColumns).toBe(true);
    expect(VM_TABLE_VARIANT_UI.overview.hideToolbarActions).toBe(false);
  });

  it("compact variant uses fixed columns only", () => {
    const columns = resolveVisibleColumns({
      variant: "compact",
      userSelectedColumns: ["id", "issues"],
      showGroupsColumn: false,
    });
    expect(columns).toEqual(COMPACT_VISIBLE_COLUMNS);
  });

  it("overview variant merges user columns with mandatory columns", () => {
    const columns = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: ["name", "cluster"],
      showGroupsColumn: false,
    });
    expect(columns).toContain("name");
    expect(columns).toContain("cluster");
    expect(columns).not.toContain("groups");
  });

  it("overview variant appends groups column when enabled", () => {
    const columns = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: [...MANDATORY_COLUMNS],
      showGroupsColumn: true,
    });
    expect(columns).toContain("groups");
  });

  it("overview variant filters unknown column keys", () => {
    const columns = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: [
        "name",
        "not-a-column" as (typeof ALL_COLUMN_KEYS)[number],
      ],
      showGroupsColumn: false,
    });
    expect(columns).toEqual(["name"]);
  });
});

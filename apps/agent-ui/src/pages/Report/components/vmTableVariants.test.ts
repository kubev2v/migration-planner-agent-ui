import { describe, expect, it } from "vitest";
import {
  type ALL_COLUMN_KEYS,
  COMPACT_VISIBLE_COLUMNS,
  resolveVisibleColumns,
  VM_TABLE_VARIANT_UI,
} from "./vmTableShared";

describe("vmTableVariants", () => {
  it("compact variant disables overview-only UI", () => {
    expect(VM_TABLE_VARIANT_UI.compact).toEqual({
      showManageColumns: false,
      hideToolbarActions: true,
      disableVmNavigation: true,
      showGroupsFilter: true,
      defaultColumnsKeys: [
        "name",
        "labels",
        "vCenterState",
        "migratable",
        "cluster",
      ],
    });
  });

  it("overview variant enables full toolbar and column management", () => {
    expect(VM_TABLE_VARIANT_UI.overview.showManageColumns).toBe(true);
    expect(VM_TABLE_VARIANT_UI.overview.hideToolbarActions).toBe(false);
    expect(VM_TABLE_VARIANT_UI.overview.showGroupsFilter).toBe(true);
  });

  it("groups variant hides groups filter", () => {
    expect(VM_TABLE_VARIANT_UI.groups.showGroupsFilter).toBe(false);
  });

  it("compact variant ignore user selected columns", () => {
    const columns = resolveVisibleColumns({
      variant: "compact",
      userSelectedColumns: ["id", "issues"],
    });
    expect(columns).toEqual(COMPACT_VISIBLE_COLUMNS);
  });

  it("overview variant merges user columns with mandatory columns", () => {
    const columns = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: ["name", "cluster"],
    });
    expect(columns).toContain("name");
    expect(columns).toContain("cluster");
    expect(columns).not.toContain("groups");
  });

  it("overview variant filters unknown column keys", () => {
    const columns = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: [
        "name",
        "not-a-column" as (typeof ALL_COLUMN_KEYS)[number],
      ],
    });
    expect(columns).toEqual(["name"]);
  });

  it("removes groups column when variant is groups", () => {
    const columns = resolveVisibleColumns({
      variant: "groups",
      userSelectedColumns: ["name", "groups", "cluster", "labels"],
    });
    expect(columns).not.toContain("groups");
    expect(columns).toContain("name");
    expect(columns).toContain("cluster");
    expect(columns).toContain("labels");
  });

  it("includes groups column when variant is overview", () => {
    const columns = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: ["name", "groups", "cluster", "labels"],
    });
    expect(columns).toContain("groups");
  });

  it("removes groups column when variant is compact", () => {
    const columns = resolveVisibleColumns({
      variant: "compact",
      userSelectedColumns: ["name", "groups", "cluster", "labels"],
    });
    expect(columns).not.toContain("groups");
  });

  it("includes deepInspection when user selects it", () => {
    const result = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: ["name", "deepInspection"],
    });
    expect(result).toContain("deepInspection");
    expect(result).toContain("name");
  });

  it("includes deepInspection in groups variant when user selects it", () => {
    const result = resolveVisibleColumns({
      variant: "groups",
      userSelectedColumns: ["name", "deepInspection", "groups"],
    });
    expect(result).toContain("deepInspection");
    expect(result).not.toContain("groups");
    expect(result).toContain("name");
  });

  it("maintains column order from ALL_COLUMN_KEYS regardless of user selection order", () => {
    // User selects columns in reverse order
    const result = resolveVisibleColumns({
      variant: "overview",
      userSelectedColumns: ["issues", "memory", "cluster", "name"],
    });
    // Should be reordered to match ALL_COLUMN_KEYS definition
    expect(result).toEqual(["name", "cluster", "memory", "issues"]);
  });
});

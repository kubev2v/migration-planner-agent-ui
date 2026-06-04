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
      groupsDisplay: "labels",
      defaultColumnsKeys: [
        "name",
        "labels",
        "vCenterState",
        "migratable",
        "cluster",
      ],
    });
  });

  it("overview variant uses comma-separated groups and full toolbar", () => {
    expect(VM_TABLE_VARIANT_UI.overview.groupsDisplay).toBe("text");
    expect(VM_TABLE_VARIANT_UI.overview.showManageColumns).toBe(true);
    expect(VM_TABLE_VARIANT_UI.overview.hideToolbarActions).toBe(false);
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
});

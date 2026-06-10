import { describe, expect, it } from "vitest";
import {
  ALL_TOGGLEABLE_COLUMN_KEYS,
  DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS,
  FIXED_COLUMN_COUNT,
  isToggleableColumnVisible,
  toggleToggleableColumn,
  totalColumnCount,
} from "./storageOffloadColumns";

describe("storageOffloadColumns", () => {
  it("shows all toggleable columns by default", () => {
    expect(DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS).toEqual(
      ALL_TOGGLEABLE_COLUMN_KEYS,
    );
  });

  it("toggles column visibility", () => {
    const hidden = toggleToggleableColumn(
      "mean",
      DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS,
    );
    expect(isToggleableColumnVisible("mean", hidden)).toBe(false);
    expect(isToggleableColumnVisible("median", hidden)).toBe(true);

    const restored = toggleToggleableColumn("mean", hidden);
    expect(isToggleableColumnVisible("mean", restored)).toBe(true);
  });

  it("counts fixed and visible toggleable columns", () => {
    const hidden = toggleToggleableColumn(
      "mean",
      DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS,
    );
    expect(totalColumnCount(hidden)).toBe(
      FIXED_COLUMN_COUNT + DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS.length - 1,
    );
  });
});

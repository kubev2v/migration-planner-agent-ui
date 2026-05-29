import { describe, expect, it } from "vitest";
import { filtersToByExpression } from "./vmFilters";

describe("filtersToByExpression showExcludedVMs", () => {
  it("hides excluded VMs when the toggle is off", () => {
    expect(filtersToByExpression({ showExcludedVMs: false })).toBe(
      "migration_excluded = false",
    );
  });

  it("explicitly includes excluded VMs when the toggle is on", () => {
    expect(filtersToByExpression({ showExcludedVMs: true })).toBe(
      "(migration_excluded = true or migration_excluded = false)",
    );
  });

  it("combines the excluded VM filter with other filters", () => {
    expect(
      filtersToByExpression({
        showExcludedVMs: false,
        search: "web",
      }),
    ).toBe("name like 'web' and migration_excluded = false");
  });
});

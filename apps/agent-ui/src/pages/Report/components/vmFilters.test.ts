import { describe, expect, it } from "vitest";
import { filtersToByExpression } from "./vmFilters";

describe("filtersToByExpression vmLabels", () => {
  it("uses a single contains check for one label", () => {
    expect(filtersToByExpression({ vmLabels: ["prod"] })).toBe(
      "(labels contains 'prod')",
    );
  });

  it("uses OR when multiple labels are selected", () => {
    expect(filtersToByExpression({ vmLabels: ["prod", "tier-1"] })).toBe(
      "(labels contains 'prod' or labels contains 'tier-1')",
    );
  });

  it("escapes single quotes in label values", () => {
    expect(filtersToByExpression({ vmLabels: ["it's", "ok"] })).toBe(
      "(labels contains 'it\\'s' or labels contains 'ok')",
    );
  });
});

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

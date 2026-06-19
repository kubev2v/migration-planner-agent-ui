import { describe, expect, it } from "vitest";
import {
  filtersToByExpression,
  filtersToSearchParams,
  searchParamsToFilters,
} from "./vmFilters";

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

describe("filtersToByExpression utilization ranges", () => {
  it("filters by CPU usage range", () => {
    expect(
      filtersToByExpression({ cpuUsageRange: { min: 76, max: 100 } }),
    ).toBe("utilization.cpu_max >= 76 and utilization.cpu_max <= 100");
  });

  it("filters by RAM usage range", () => {
    expect(filtersToByExpression({ ramUsageRange: { min: 0, max: 25 } })).toBe(
      "utilization.mem_max >= 0 and utilization.mem_max <= 25",
    );
  });

  it("filters by disk usage range", () => {
    expect(
      filtersToByExpression({ diskUsageRange: { min: 51, max: 75 } }),
    ).toBe("utilization.disk >= 51 and utilization.disk <= 75");
  });
});

describe("filtersToByExpression groups", () => {
  it("uses a single contains check for one group", () => {
    expect(filtersToByExpression({ groups: ["production"] })).toBe(
      "(groups contains 'production')",
    );
  });

  it("uses OR when multiple groups are selected", () => {
    expect(filtersToByExpression({ groups: ["prod", "staging"] })).toBe(
      "(groups contains 'prod' or groups contains 'staging')",
    );
  });

  it("escapes single quotes in group names", () => {
    expect(filtersToByExpression({ groups: ["it's", "ok"] })).toBe(
      "(groups contains 'it\\'s' or groups contains 'ok')",
    );
  });
});

describe("groups URL params", () => {
  it("round-trips multiple groups via repeated params", () => {
    const params = filtersToSearchParams({ groups: ["production", "staging"] });
    expect(params.getAll("groups")).toEqual(["production", "staging"]);
    expect(searchParamsToFilters(params).groups).toEqual([
      "production",
      "staging",
    ]);
  });

  it("preserves group names containing commas", () => {
    const filters = { groups: ["team,a", "team,b"] };
    const roundTripped = searchParamsToFilters(filtersToSearchParams(filters));
    expect(roundTripped.groups).toEqual(["team,a", "team,b"]);
  });

  it("still parses legacy comma-separated groups param", () => {
    const params = new URLSearchParams("groups=prod,staging");
    expect(searchParamsToFilters(params).groups).toEqual(["prod", "staging"]);
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

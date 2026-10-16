import { describe, expect, it } from "vitest";
import {
  buildScopedVmByExpression,
  clusterSelectionExpression,
  filtersToByExpression,
  filtersToSearchParams,
  searchParamsToFilters,
  withDefaultReportInclusion,
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

describe("filtersToByExpression reportInclusion", () => {
  it("shows only included VMs when only included is selected", () => {
    expect(filtersToByExpression({ reportInclusion: ["included"] })).toBe(
      "migration_excluded = false",
    );
  });

  it("shows only excluded VMs when only excluded is selected", () => {
    expect(filtersToByExpression({ reportInclusion: ["excluded"] })).toBe(
      "migration_excluded = true",
    );
  });

  it("shows all VMs when both options are selected", () => {
    expect(
      filtersToByExpression({ reportInclusion: ["included", "excluded"] }),
    ).toBe("(migration_excluded = true or migration_excluded = false)");
  });

  it("shows all VMs by default when no report inclusion filter is set", () => {
    expect(filtersToByExpression({})).toBeUndefined();
  });

  it("shows all VMs when the default report inclusion is applied", () => {
    expect(
      filtersToByExpression(withDefaultReportInclusion({ search: "web" })),
    ).toBe(
      "name like 'web' and (migration_excluded = true or migration_excluded = false)",
    );
  });

  it("combines the report inclusion filter with other filters", () => {
    expect(
      filtersToByExpression({
        reportInclusion: ["included"],
        search: "web",
      }),
    ).toBe("name like 'web' and migration_excluded = false");
  });
});

describe("cluster selection scope", () => {
  it("does not add a cluster clause for all clusters", () => {
    expect(clusterSelectionExpression("all")).toBeUndefined();
    expect(clusterSelectionExpression(undefined)).toBeUndefined();
    expect(buildScopedVmByExpression({ search: "web" }, "all")).toBe(
      "name like 'web' and (migration_excluded = true or migration_excluded = false)",
    );
  });

  it("limits the VM list to the selected inventory cluster id", () => {
    expect(clusterSelectionExpression("cluster-fb55d09a08ee0c0f")).toBe(
      "cluster_id = 'cluster-fb55d09a08ee0c0f'",
    );
    expect(buildScopedVmByExpression({}, "cluster-fb55d09a08ee0c0f")).toBe(
      "(cluster_id = 'cluster-fb55d09a08ee0c0f') and ((migration_excluded = true or migration_excluded = false))",
    );
  });

  it("keeps table filters and escapes the cluster id", () => {
    expect(buildScopedVmByExpression({ search: "web" }, "it's")).toBe(
      "(cluster_id = 'it\\'s') and (name like 'web' and (migration_excluded = true or migration_excluded = false))",
    );
  });
});

describe("reportInclusion URL params", () => {
  it("round-trips report inclusion values", () => {
    const params = filtersToSearchParams({
      reportInclusion: ["included", "excluded"],
    });
    expect(params.get("reportInclusion")).toBe("included,excluded");
    expect(searchParamsToFilters(params).reportInclusion).toEqual([
      "included",
      "excluded",
    ]);
  });
});

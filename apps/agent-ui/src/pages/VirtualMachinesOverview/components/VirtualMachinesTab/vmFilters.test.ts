import { describe, expect, it } from "vitest";
import {
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

  it("preserves a single group name containing a comma", () => {
    const params = new URLSearchParams();
    params.append("groups", "team,a");
    expect(searchParamsToFilters(params).groups).toEqual(["team,a"]);
  });

  it("preserves group names containing commas", () => {
    const filters = { groups: ["team,a", "team,b"] };
    const roundTripped = searchParamsToFilters(filtersToSearchParams(filters));
    expect(roundTripped.groups).toEqual(["team,a", "team,b"]);
  });
});

describe("filtersToByExpression applications", () => {
  it("uses a single equals check for one application", () => {
    expect(filtersToByExpression({ applications: ["SAP ERP"] })).toBe(
      "application = 'SAP ERP'",
    );
  });

  it("uses in when multiple applications are selected", () => {
    expect(
      filtersToByExpression({ applications: ["PostgreSQL", "MySQL"] }),
    ).toBe("application in ['PostgreSQL','MySQL']");
  });

  it("escapes single quotes in application names", () => {
    expect(filtersToByExpression({ applications: ["it's ok"] })).toBe(
      "application = 'it\\'s ok'",
    );
  });

  it("supports legacy vmApplication param", () => {
    expect(filtersToByExpression({ vmApplication: "Nginx" })).toBe(
      "application = 'Nginx'",
    );
  });
});

describe("applications URL params", () => {
  it("round-trips multiple applications via repeated params", () => {
    const params = filtersToSearchParams({
      applications: ["SAP ERP", "Nginx"],
    });
    expect(params.getAll("applications")).toEqual(["SAP ERP", "Nginx"]);
    expect(searchParamsToFilters(params).applications).toEqual([
      "SAP ERP",
      "Nginx",
    ]);
  });

  it("preserves application names containing commas", () => {
    const filters = { applications: ["team,a", "SAP ERP"] };
    const roundTripped = searchParamsToFilters(filtersToSearchParams(filters));
    expect(roundTripped.applications).toEqual(["team,a", "SAP ERP"]);
  });

  it("maps legacy vmApplication param to applications", () => {
    const params = new URLSearchParams();
    params.set("vmApplication", "SAP ERP");
    expect(searchParamsToFilters(params).applications).toEqual(["SAP ERP"]);
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

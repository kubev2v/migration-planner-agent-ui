import { describe, expect, it } from "vitest";
import {
  filterApplications,
  filterVmsBySearch,
  getUniqueVms,
  matchesSearch,
  paginateItems,
} from "./applicationFilters";
import type { ApplicationOverview } from "./applicationsApi";

const applications: ApplicationOverview[] = [
  {
    name: "Apache HTTP Server",
    description: "",
    vmCount: 1,
    vms: [{ id: "vm-1", name: "web-01.prod.local" }],
  },
  {
    name: "PostgreSQL",
    description: "",
    vmCount: 1,
    vms: [{ id: "vm-2", name: "db-01.prod.local" }],
  },
];

describe("matchesSearch", () => {
  it("matches case-insensitively", () => {
    expect(matchesSearch("Apache HTTP Server", "apache")).toBe(true);
  });
});

describe("filterApplications", () => {
  it("filters by application name", () => {
    expect(
      filterApplications(applications, { nameSearch: "apache", vmIds: [] }),
    ).toEqual([applications[0]]);
  });

  it("filters by selected VM ids", () => {
    expect(
      filterApplications(applications, { nameSearch: "", vmIds: ["vm-2"] }),
    ).toEqual([applications[1]]);
  });

  it("combines name and VM filters", () => {
    expect(
      filterApplications(applications, {
        nameSearch: "post",
        vmIds: ["vm-2"],
      }),
    ).toEqual([applications[1]]);
  });
});

describe("getUniqueVms", () => {
  it("deduplicates VMs across applications", () => {
    const shared: ApplicationOverview[] = [
      {
        name: "App A",
        description: "",
        vmCount: 1,
        vms: [{ id: "vm-1", name: "shared" }],
      },
      {
        name: "App B",
        description: "",
        vmCount: 1,
        vms: [{ id: "vm-1", name: "shared" }],
      },
    ];
    expect(getUniqueVms(shared)).toEqual([{ id: "vm-1", name: "shared" }]);
  });
});

describe("filterVmsBySearch", () => {
  it("returns all VMs when search is empty", () => {
    expect(filterVmsBySearch(applications[0].vms, "")).toEqual(
      applications[0].vms,
    );
  });

  it("filters VMs by name", () => {
    expect(filterVmsBySearch(applications[0].vms, "web-01")).toEqual(
      applications[0].vms,
    );
  });
});

describe("paginateItems", () => {
  it("returns the requested page slice", () => {
    expect(paginateItems([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });
});

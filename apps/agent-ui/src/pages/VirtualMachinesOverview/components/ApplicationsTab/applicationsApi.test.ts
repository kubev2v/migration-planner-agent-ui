import { describe, expect, it } from "vitest";
import {
  type ApplicationOverview,
  buildVmApplicationsMap,
  getApplicationsForVm,
} from "./applicationsApi";

const sampleApplications: ApplicationOverview[] = [
  {
    name: "Apache HTTP Server",
    description: "Web server",
    vmCount: 2,
    vms: [
      { id: "vm-1", name: "web-01" },
      { id: "vm-2", name: "web-02" },
    ],
  },
  {
    name: "PostgreSQL",
    description: "Database",
    vmCount: 2,
    vms: [
      { id: "vm-2", name: "web-02" },
      { id: "vm-3", name: "db-01" },
    ],
  },
  {
    name: "Nginx",
    description: "Web server",
    vmCount: 1,
    vms: [{ id: "vm-4", name: "edge-01" }],
  },
];

describe("buildVmApplicationsMap", () => {
  it("maps VM ids to sorted application names", () => {
    expect(buildVmApplicationsMap(sampleApplications)).toEqual(
      new Map([
        ["vm-1", ["Apache HTTP Server"]],
        ["vm-2", ["Apache HTTP Server", "PostgreSQL"]],
        ["vm-3", ["PostgreSQL"]],
        ["vm-4", ["Nginx"]],
      ]),
    );
  });

  it("returns an empty map when no applications are provided", () => {
    expect(buildVmApplicationsMap([])).toEqual(new Map());
  });
});

describe("getApplicationsForVm", () => {
  it("returns empty list when VM has no detected applications", () => {
    expect(getApplicationsForVm(sampleApplications, "vm-missing")).toEqual([]);
  });

  it("returns all applications running on the VM", () => {
    expect(getApplicationsForVm(sampleApplications, "vm-2")).toEqual([
      sampleApplications[0],
      sampleApplications[1],
    ]);
  });

  it("returns a single application when only one matches", () => {
    expect(getApplicationsForVm(sampleApplications, "vm-4")).toEqual([
      sampleApplications[2],
    ]);
  });
});

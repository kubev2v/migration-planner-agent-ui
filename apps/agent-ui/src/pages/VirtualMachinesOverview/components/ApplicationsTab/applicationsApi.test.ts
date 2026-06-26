import { describe, expect, it } from "vitest";
import type { ApplicationOverview } from "./applicationsApi";
import { scopeApplicationsToVms } from "./applicationsApi";

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

describe("scopeApplicationsToVms", () => {
  it("returns empty list when scope is empty", () => {
    expect(scopeApplicationsToVms(sampleApplications, new Set())).toEqual([]);
  });

  it("keeps only VMs in scope and updates vmCount", () => {
    expect(
      scopeApplicationsToVms(sampleApplications, new Set(["vm-1"])),
    ).toEqual([
      {
        name: "Apache HTTP Server",
        description: "Web server",
        vmCount: 1,
        vms: [{ id: "vm-1", name: "web-01" }],
      },
    ]);
  });

  it("drops applications with no VMs in scope", () => {
    expect(
      scopeApplicationsToVms(sampleApplications, new Set(["vm-1", "vm-3"])),
    ).toEqual([
      {
        name: "Apache HTTP Server",
        description: "Web server",
        vmCount: 1,
        vms: [{ id: "vm-1", name: "web-01" }],
      },
      {
        name: "PostgreSQL",
        description: "Database",
        vmCount: 1,
        vms: [{ id: "vm-3", name: "db-01" }],
      },
    ]);
  });
});

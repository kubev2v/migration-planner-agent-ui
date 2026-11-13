import { describe, expect, it } from "vitest";
import { filterAppliances } from "./applianceFilters";
import type { ApplianceOverview } from "./appliancesApi";

const appliances: ApplianceOverview[] = [
  {
    name: "F5 BIG-IP Virtual Edition",
    vendor: "F5",
    version: "16.1",
    confidence: 75,
    vmCount: 2,
    vms: [
      { id: "vm-1", name: "lb-01" },
      { id: "vm-2", name: "lb-02" },
    ],
  },
  {
    name: "vCenter Server Appliance (VCSA)",
    vendor: "Broadcom / VMware",
    version: "",
    confidence: 75,
    vmCount: 1,
    vms: [{ id: "vm-3", name: "vcsa-01" }],
  },
];

describe("filterAppliances", () => {
  it("filters by vendor", () => {
    expect(
      filterAppliances(appliances, {
        nameSearch: "",
        vmIds: [],
        vendors: ["F5"],
        versions: [],
      }),
    ).toEqual([appliances[0]]);
  });

  it("filters by VM membership", () => {
    expect(
      filterAppliances(appliances, {
        nameSearch: "",
        vmIds: ["vm-3"],
        vendors: [],
        versions: [],
      }),
    ).toEqual([appliances[1]]);
  });
});

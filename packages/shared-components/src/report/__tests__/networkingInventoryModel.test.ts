import { describe, expect, it } from "vitest";
import {
  buildNetworkingInventorySummary,
  buildNetworkingInventoryTableRows,
  filterNetworkingRowsBySearch,
  formatNetworkTypeLabel,
} from "../networkingInventoryModel.js";

describe("buildNetworkingInventorySummary", () => {
  it("aggregates counts by type and distinct VLAN", () => {
    const summary = buildNetworkingInventorySummary([
      { name: "A", type: "distributed", vlanId: "10" },
      { name: "B", type: "distributed", vlanId: "11" },
      { name: "C", type: "standard", vlanId: "10" },
      { name: "D", type: "dvswitch" },
    ]);
    expect(summary).toEqual({
      networks: 4,
      vlansAndRanges: 2,
      distributedNetworks: 3,
      standardNetworks: 1,
    });
  });
});

describe("buildNetworkingInventoryTableRows", () => {
  it("maps optional fields to display labels", () => {
    const [row] = buildNetworkingInventoryTableRows(
      [
        {
          name: "VM Network",
          type: "distributed",
          vlanId: "341",
          vmsCount: 5,
          dvswitch: "vDSwitch1",
        },
      ],
      "Entire environment",
    );
    expect(row).toMatchObject({
      name: "VM Network",
      typeLabel: "Distributed",
      vlanLabel: "341",
      connectedVmsLabel: "5",
      distributedSwitchLabel: "vDSwitch1",
      scopeLabel: "Entire environment",
    });
  });
});

describe("filterNetworkingRowsBySearch", () => {
  it("filters rows by network name", () => {
    const rows = buildNetworkingInventoryTableRows(
      [{ name: "vm_traffic" }, { name: "vMotion" }],
      "Entire environment",
    );
    expect(filterNetworkingRowsBySearch(rows, "vmo")).toHaveLength(1);
    expect(filterNetworkingRowsBySearch(rows, "vmo")[0]?.name).toBe("vMotion");
  });
});

describe("formatNetworkTypeLabel", () => {
  it("labels dvswitch as Distributed", () => {
    expect(formatNetworkTypeLabel("dvswitch")).toBe("Distributed");
  });
});

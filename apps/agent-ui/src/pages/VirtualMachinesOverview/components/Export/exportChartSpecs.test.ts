import type { Infra, VMs } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import { captureExportCharts } from "./captureExportCharts";
import { buildExportChartSpecs } from "./exportChartSpecs";

const emptyResourceBreakdown = {
  total: 0,
  totalForMigratable: 0,
  totalForMigratableWithWarnings: 0,
  totalForNotMigratable: 0,
} as const;

const infra: Infra = {
  totalHosts: 1,
  hostPowerStates: {},
  networks: [],
  datastores: [],
};

const vms: VMs = {
  total: 2,
  totalMigratable: 1,
  cpuCores: emptyResourceBreakdown,
  ramGB: emptyResourceBreakdown,
  diskGB: emptyResourceBreakdown,
  diskCount: emptyResourceBreakdown,
  powerStates: {},
  notMigratableReasons: [],
  migrationWarnings: [],
};

describe("buildExportChartSpecs", () => {
  it("prints each chart view as its own spec on the aggregate report", () => {
    const specs = buildExportChartSpecs({
      infra,
      vms,
      isAggregateView: true,
    });

    expect(specs.map((spec) => spec.id)).toEqual([
      "infrastructure-summary",
      "vcenter-cluster-details",
      "host-power-states",
      "vm-power-states",
      "vm-migration-issues-vs-no-issues",
      "vm-migration-issues-breakdown",
      "os-distribution",
      "cpu-memory-memory-tiers",
      "cpu-memory-vcpu-tiers",
      "storage-total-size",
      "storage-vm-count",
      "storage-vm-count-by-disk-type",
      "storage-shared-disks",
      "clusters-data-center-distribution",
      "clusters-vm-by-cluster",
      "clusters-cpu-over-commitment",
      "hosts-by-model",
      "networks-distribution",
      "networks-nic-count",
      "warnings",
      "errors",
    ]);
    expect(specs[0].filename).toBe("01-infrastructure-summary.png");
    expect(specs.every((spec) => spec.node)).toBe(true);
  });

  it("omits cluster distribution charts on a specific-cluster view", () => {
    expect(
      buildExportChartSpecs({
        infra,
        vms,
        isAggregateView: false,
      }).map((spec) => spec.id),
    ).not.toContain("clusters-data-center-distribution");
  });
});

describe("captureExportCharts", () => {
  it("renders one spec at a time through the print host", async () => {
    const capturedNodes: unknown[] = [];
    let cleared = false;
    const printHost = {
      capture: async (node: unknown) => {
        capturedNodes.push(node);
        const canvas = document.createElement("canvas");
        canvas.width = 10;
        canvas.height = 10;
        return canvas;
      },
      clear: () => {
        cleared = true;
      },
    };

    const specs = [
      { id: "a", title: "A", filename: "01-a.png", node: "first" },
      { id: "b", title: "B", filename: "02-b.png", node: "second" },
    ];

    const captured = await captureExportCharts(printHost, specs);

    expect(capturedNodes).toEqual(["first", "second"]);
    expect(cleared).toBe(true);
    expect(captured.map((chart) => chart.filename)).toEqual([
      "01-a.png",
      "02-b.png",
    ]);
  });
});

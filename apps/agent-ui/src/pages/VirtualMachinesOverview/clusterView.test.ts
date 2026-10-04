import type { Infra, VMs } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import {
  buildClusterViewModel,
  getClusterScopedHeaderCounts,
} from "./clusterView";

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

const vms = (total: number): VMs => ({
  total,
  totalMigratable: total,
  cpuCores: emptyResourceBreakdown,
  ramGB: emptyResourceBreakdown,
  diskGB: emptyResourceBreakdown,
  diskCount: emptyResourceBreakdown,
  powerStates: {},
  notMigratableReasons: [],
  migrationWarnings: [],
});

const clusters = {
  prod: { infra, vms: vms(4), clusterName: "Production" },
  dev: { infra, vms: vms(2) },
};

describe("getClusterScopedHeaderCounts", () => {
  it("uses the aggregate inventory when all clusters are selected", () => {
    const clusterView = buildClusterViewModel({
      infra,
      vms: vms(7),
      clusters,
      selectedClusterId: "all",
    });

    expect(getClusterScopedHeaderCounts(clusterView)).toEqual({
      totalVMs: 7,
      totalClusters: 2,
    });
  });

  it("uses only the selected cluster", () => {
    const clusterView = buildClusterViewModel({
      infra,
      vms: vms(7),
      clusters,
      selectedClusterId: "prod",
    });

    expect(clusterView.viewVms?.total).toBe(4);
    expect(clusterView.selectionLabel).toBe("Production");
    expect(
      clusterView.clusterOptions.find((option) => option.id === "prod")?.label,
    ).toBe("Production");
    expect(getClusterScopedHeaderCounts(clusterView)).toEqual({
      totalVMs: 4,
      totalClusters: 1,
    });
  });

  it("falls back to the aggregate when the selected cluster is gone", () => {
    const clusterView = buildClusterViewModel({
      infra,
      vms: vms(7),
      clusters,
      selectedClusterId: "missing",
    });

    expect(clusterView.selectionId).toBe("all");
    expect(getClusterScopedHeaderCounts(clusterView)).toEqual({
      totalVMs: 7,
      totalClusters: 2,
    });
  });
});

import type { Infra, VMs } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import { buildClusterViewModel, getFleetHeaderCounts } from "./clusterView";

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
  prod: { infra, vms: vms(4) },
  dev: { infra, vms: vms(2) },
};

const aggregateVms = vms(7);

describe("getFleetHeaderCounts", () => {
  it("uses aggregate inventory totals", () => {
    expect(getFleetHeaderCounts({ vms: aggregateVms, clusters })).toEqual({
      totalVMs: 7,
      totalClusters: 2,
    });
  });

  it("is unchanged when a single cluster is selected in the view model", () => {
    buildClusterViewModel({
      infra,
      vms: aggregateVms,
      clusters,
      selectedClusterId: "prod",
    });

    expect(getFleetHeaderCounts({ vms: aggregateVms, clusters })).toEqual({
      totalVMs: 7,
      totalClusters: 2,
    });
  });
});

describe("buildClusterViewModel", () => {
  it("scopes view data to the selected cluster", () => {
    const clusterView = buildClusterViewModel({
      infra,
      vms: aggregateVms,
      clusters,
      selectedClusterId: "prod",
    });

    expect(clusterView.viewVms?.total).toBe(4);
    expect(clusterView.isAggregateView).toBe(false);
  });

  it("falls back to the aggregate when the selected cluster is gone", () => {
    const clusterView = buildClusterViewModel({
      infra,
      vms: aggregateVms,
      clusters,
      selectedClusterId: "missing",
    });

    expect(clusterView.selectionId).toBe("all");
    expect(clusterView.viewVms?.total).toBe(7);
    expect(clusterView.isAggregateView).toBe(true);
  });
});

import type {
  Infra,
  Inventory,
  VirtualMachine,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import {
  adjustInventoryForMigrationExcludedChange,
  getInventoryAggregateView,
  resolveInventoryAfterMigrationChange,
} from "./inventoryParsing";

const emptyResourceBreakdown = {
  total: 0,
  totalForMigratable: 0,
  totalForMigratableWithWarnings: 0,
  totalForNotMigratable: 0,
} as const;

const testInfra = (totalHosts: number): Infra => ({
  totalHosts,
  hostPowerStates: {},
  networks: [],
  datastores: [],
});

const testVms = (total: number, totalMigratable: number): VMs => ({
  total,
  totalMigratable,
  cpuCores: emptyResourceBreakdown,
  ramGB: emptyResourceBreakdown,
  diskGB: emptyResourceBreakdown,
  diskCount: emptyResourceBreakdown,
  powerStates: {},
  notMigratableReasons: [],
  migrationWarnings: [],
});

const baseInventory: Inventory = {
  vcenter_id: "vc-1",
  clusters: {
    "cluster-a": {
      infra: testInfra(1),
      vms: testVms(2, 1),
    },
  },
  vcenter: {
    infra: testInfra(1),
    vms: testVms(2, 1),
  },
};

const vm: VirtualMachine = {
  id: "vm-1",
  name: "web-1",
  vCenterState: "poweredOn",
  cluster: "cluster-a",
  datacenter: "dc-1",
  diskSize: 1024,
  memory: 4096,
  issueCount: 0,
  migratable: true,
  migrationExcluded: false,
};

describe("adjustInventoryForMigrationExcludedChange", () => {
  it("decrements VM totals when excluding from reports", () => {
    const updated = adjustInventoryForMigrationExcludedChange(
      baseInventory,
      ["vm-1"],
      true,
      [vm],
    );

    expect(getInventoryAggregateView(updated).vms?.total).toBe(1);
    expect(updated.clusters["cluster-a"].vms?.total).toBe(1);
  });

  it("updates cluster aggregate totals when vcenter VMs are absent", () => {
    const clusterOnlyInventory: Inventory = {
      vcenter_id: "vc-1",
      clusters: {
        prod: {
          infra: testInfra(2),
          vms: testVms(5, 3),
        },
      },
    };

    const updated = adjustInventoryForMigrationExcludedChange(
      clusterOnlyInventory,
      ["vm-1"],
      true,
      [{ ...vm, cluster: "prod" }],
    );

    expect(getInventoryAggregateView(updated).vms?.total).toBe(4);
    expect(updated.clusters.prod.vms?.total).toBe(4);
  });
});

describe("getInventoryAggregateView", () => {
  it("prefers vcenter VM totals even when vcenter infra is missing", () => {
    const inventory: Inventory = {
      vcenter_id: "vc-1",
      clusters: {
        prod: {
          infra: testInfra(3),
          vms: testVms(99, 50),
        },
      },
      vcenter: {
        infra: testInfra(1),
        vms: testVms(10, 8),
      },
    };

    expect(getInventoryAggregateView(inventory).vms?.total).toBe(10);
  });
});

describe("resolveInventoryAfterMigrationChange", () => {
  it("keeps optimistic inventory when server response is stale", () => {
    const optimistic = adjustInventoryForMigrationExcludedChange(
      baseInventory,
      ["vm-1"],
      true,
      [vm],
    );

    const resolved = resolveInventoryAfterMigrationChange(
      optimistic,
      baseInventory,
      { vmIds: ["vm-1"], excluded: true, affectedVms: [vm] },
      2,
    );

    expect(getInventoryAggregateView(resolved).vms?.total).toBe(1);
  });
});

import type {
  Infra,
  VirtualMachine,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adjustInventoryForMigrationExcludedChange,
  fetchReportInventoryFromApi,
  getInventoryAggregateView,
  type InventoryPayload,
  inventoryFromGroupResponse,
  parseInventoryResponse,
} from "./inventoryParsing";
import type { VirtualMachineWithExclusion } from "./virtualMachineParsing";

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

const baseInventory: InventoryPayload = {
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

const vm: VirtualMachineWithExclusion = {
  id: "vm-1",
  name: "web-1",
  vCenterID: "vc-1",
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
    const clusterOnlyInventory: InventoryPayload = {
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
    const inventory: InventoryPayload = {
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

describe("sequential migration excluded changes", () => {
  it("restores totals after exclude then include", () => {
    let inventory = baseInventory;
    inventory = adjustInventoryForMigrationExcludedChange(
      inventory,
      ["vm-1"],
      true,
      [vm],
    );
    inventory = adjustInventoryForMigrationExcludedChange(
      inventory,
      ["vm-1"],
      false,
      [{ ...vm, migrationExcluded: true } as VirtualMachineWithExclusion],
    );

    expect(getInventoryAggregateView(inventory).vms?.total).toBe(2);
  });

  it("applies bulk exclude then bulk include", () => {
    const vm2: VirtualMachine = { ...vm, id: "vm-2", name: "web-2" };
    const inventoryWithTwo: InventoryPayload = {
      ...baseInventory,
      vcenter: {
        infra: testInfra(1),
        vms: testVms(2, 2),
      },
    };

    let inventory = adjustInventoryForMigrationExcludedChange(
      inventoryWithTwo,
      ["vm-1", "vm-2"],
      true,
      [vm, vm2],
    );
    inventory = adjustInventoryForMigrationExcludedChange(
      inventory,
      ["vm-1", "vm-2"],
      false,
      [
        { ...vm, migrationExcluded: true } as VirtualMachineWithExclusion,
        { ...vm2, migrationExcluded: true } as VirtualMachineWithExclusion,
      ],
    );

    expect(getInventoryAggregateView(inventory).vms?.total).toBe(2);
  });
});

describe("inventoryFromGroupResponse", () => {
  it("returns group-scoped Inventory1 payloads", () => {
    expect(
      inventoryFromGroupResponse({
        inventory: baseInventory,
      }),
    ).toEqual(baseInventory);
  });

  it("returns null when the group has no inventory", () => {
    expect(inventoryFromGroupResponse({})).toBeNull();
    expect(inventoryFromGroupResponse({ inventory: null })).toBeNull();
  });
});

describe("standalone analyzer inventory (GET /inventory InventoryResponse)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parseInventoryResponse reads data from { data, vcenters }", () => {
    const parsed = parseInventoryResponse({
      data: {
        vcenter_id: "vc-a",
        clusters: {},
        vcenter: {
          infra: testInfra(0),
          vms: testVms(42, 40),
        },
      },
      vcenters: [{ id: "vc-a" }, { id: "vc-b" }],
    });
    expect(parsed?.vcenter_id).toBe("vc-a");
    expect(parsed?.vcenter?.vms?.total).toBe(42);
  });

  it("fetchReportInventoryFromApi loads GET /inventory/vcenters/{vid} when scoped", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/assessments")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
        };
      }
      if (url.endsWith("/inventory")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              vcenter_id: "vc-a",
              clusters: {},
              vcenter: {
                infra: testInfra(1),
                vms: testVms(100, 80),
              },
            },
            vcenters: [{ id: "vc-a" }, { id: "vc-b" }],
          }),
        };
      }
      if (url.includes("/inventory/vcenters/vc-b")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            inventory: {
              vcenter_id: "vc-b",
              clusters: {},
              vcenter: {
                infra: testInfra(1),
                vms: testVms(7, 6),
              },
            },
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchReportInventoryFromApi(
      "http://localhost/api/v1",
      "vc-b",
    );

    // Probes SaaS `GET .../assessments`, then analyzer `GET .../inventory` + per-vCenter inventory.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.vcenters).toEqual([{ id: "vc-a" }, { id: "vc-b" }]);
    expect(result.inventory?.vcenter_id).toBe("vc-b");
    expect(result.inventory?.vcenter?.vms?.total).toBe(7);
  });
});

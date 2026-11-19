import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { parseVirtualMachineListResponse } from "../../pages/VirtualMachinesOverview/virtualMachineParsing";
import { createStore } from "../index";
import { vmsEndpoints } from "./vmsEndpoints";

/**
 * The VM table (getVMs) and the report inventory (getInventory) are two
 * independent cache entries. This suite proves a single exclusion mutation
 * invalidates both, so their counts can never diverge.
 */

const VMS_ARG = {
  byExpression: "",
  sort: [] as string[],
  page: 1,
  pageSize: 20,
};

const LIST_VM_TEMPLATE = {
  name: "vm",
  vCenterID: "vc1",
  vCenterState: "poweredOn",
  cluster: "c1",
  datacenter: "dc1",
  diskSize: 1,
  memory: 1,
  issueCount: 0,
};

function listVmListJson(total: number) {
  return {
    virtualMachines: [
      { ...LIST_VM_TEMPLATE, id: "vm1", name: "vm1" },
      { ...LIST_VM_TEMPLATE, id: "vm2", name: "vm2" },
    ],
    total,
    page: 1,
    pageCount: 1,
  };
}

function makeFakeApi(counts: { total: number }): AgentApiClient {
  return {
    configuration: { basePath: "http://localhost/agent/api/v1" },
    getLatestInventory: vi.fn(async () => ({
      data: {
        vcenter_id: "vc1",
        clusters: {},
        vcenter: { vms: { total: counts.total } },
      },
      vcenters: [{ id: "vc1" }],
    })),
    getLatestVcenterInventory: vi.fn(async () => ({
      inventory: {
        vcenter_id: "vc1",
        clusters: {},
        vcenter: { vms: { total: counts.total } },
      },
    })),
    listLatestVirtualMachinesRaw: vi.fn(async () => ({
      raw: {
        json: async () => listVmListJson(counts.total),
      },
    })),
    listLatestVirtualMachines: vi.fn(async () =>
      parseVirtualMachineListResponse(listVmListJson(counts.total)),
    ),
    getLatestVirtualMachineRaw: vi.fn(async ({ vmId }: { vmId: string }) => ({
      raw: {
        json: async () => ({
          id: vmId,
          name: vmId,
          vCenterID: "vc1",
          powerState: "poweredOn",
          connectionState: "connected",
          cpuCount: 1,
          coresPerSocket: 1,
          memoryMB: 1024,
          disks: [],
          nicCount: 0,
          nics: [],
        }),
      },
    })),
    getLatestVirtualMachine: vi.fn(async ({ vmId }: { vmId: string }) => ({
      id: vmId,
      name: vmId,
      vCenterID: "vc1",
      powerState: "poweredOn",
      connectionState: "connected",
      cpuCount: 1,
      coresPerSocket: 1,
      memoryMB: 1024,
      disks: [],
      nicCount: 0,
      nics: [],
    })),
    batchUpdateLatestVMExclusion: vi.fn(async () => undefined),
    updateLatestLabelVMs: vi.fn(async () => undefined),
    getLatestVMLabels: vi.fn(async () => ({ labels: ["prod"] })),
  } as unknown as AgentApiClient;
}

const INVENTORY_ARG = { selectedVcenterId: "all" as const };

describe("vmsEndpoints tag invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("an exclusion mutation refetches both the VM list and the inventory", async () => {
    const counts = { total: 7 };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const api = makeFakeApi(counts);
    const store = createStore(api);

    // Initial load: table and inventory both observe 7.
    await store.dispatch(vmsEndpoints.endpoints.getVMs.initiate(VMS_ARG));
    await store.dispatch(
      vmsEndpoints.endpoints.getInventory.initiate(INVENTORY_ARG),
    );

    const vmsTotal = () =>
      vmsEndpoints.endpoints.getVMs.select(VMS_ARG)(store.getState()).data
        ?.total;

    expect(vmsTotal()).toBe(7);
    expect(api.listLatestVirtualMachinesRaw).toHaveBeenCalledTimes(1);
    expect(api.getLatestInventory).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();

    // Exclude two VMs from reports, then invalidate exactly what the mutation
    // invalidates (Vms:LIST + Inventory).
    counts.total = 5;
    await store
      .dispatch(
        vmsEndpoints.endpoints.setVMExclusion.initiate({
          vmIds: ["vm1", "vm2"],
          migrationExcluded: true,
          affectedVms: [],
        }),
      )
      .unwrap();

    // Both the table source and the inventory source refetch from the single
    // exclusion invalidation — they cannot diverge.
    await vi.waitFor(() => {
      expect(api.listLatestVirtualMachinesRaw).toHaveBeenCalledTimes(2);
      expect(api.getLatestInventory).toHaveBeenCalledTimes(2);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(vmsTotal()).toBe(5);
    });
  });

  test("getInventory uses the SDK endpoint for the selected vCenter", async () => {
    const api = {
      getLatestInventory: vi.fn(async () => ({
        data: {
          vcenter_id: "all",
          clusters: {},
          vcenter: { vms: { total: 12 } },
        },
        vcenters: [{ id: "vc1" }, { id: "vc2" }],
      })),
      getLatestVcenterInventory: vi.fn(async () => ({
        inventory: {
          vcenter_id: "vc2",
          clusters: {},
          vcenter: { vms: { total: 5 } },
        },
      })),
    } as unknown as AgentApiClient;
    const store = createStore(api);

    const result = await store
      .dispatch(
        vmsEndpoints.endpoints.getInventory.initiate({
          selectedVcenterId: "vc2",
        }),
      )
      .unwrap();

    expect(api.getLatestInventory).toHaveBeenCalledWith({});
    expect(api.getLatestVcenterInventory).toHaveBeenCalledWith({ vid: "vc2" });
    expect(result.inventory?.vcenter_id).toBe("vc2");
    expect(result.inventory?.vcenter?.vms?.total).toBe(5);
  });

  test("getVMDetail merges the VM record with its utilization", async () => {
    const detailJson = {
      id: "vm1",
      name: "web",
      vCenterID: "vc1",
      powerState: "poweredOn",
      connectionState: "connected",
      cpuCount: 1,
      coresPerSocket: 1,
      memoryMB: 1024,
      disks: [],
      nicCount: 0,
      nics: [],
      metadata: { Forklift: ["migrated"] },
      annotation: "VM",
    };
    const api = {
      getLatestVirtualMachineRaw: vi.fn(async () => ({
        raw: { json: async () => detailJson },
      })),
      getLatestVMUtilization: vi.fn(async () => ({ cpu_avg: 42 })),
    } as unknown as AgentApiClient;
    const store = createStore(api);

    const result = await store
      .dispatch(vmsEndpoints.endpoints.getVMDetail.initiate("vm1"))
      .unwrap();

    expect(result).toMatchObject({
      id: "vm1",
      name: "web",
      metadata: { Forklift: ["migrated"] },
      annotation: "VM",
      utilization: { cpu_avg: 42 },
    });
    expect(api.getLatestVirtualMachineRaw).toHaveBeenCalledWith({
      vmId: "vm1",
    });
  });

  test("getVMDetail still resolves when utilization is unavailable", async () => {
    const api = {
      getLatestVirtualMachineRaw: vi.fn(async () => ({
        raw: {
          json: async () => ({
            id: "vm1",
            name: "web",
            vCenterID: "vc1",
            powerState: "poweredOn",
            connectionState: "connected",
            cpuCount: 1,
            coresPerSocket: 1,
            memoryMB: 1024,
            disks: [],
            nicCount: 0,
            nics: [],
          }),
        },
      })),
      getLatestVMUtilization: vi.fn(async () => {
        throw new Error("no metrics");
      }),
    } as unknown as AgentApiClient;
    const store = createStore(api);

    const result = await store
      .dispatch(vmsEndpoints.endpoints.getVMDetail.initiate("vm1"))
      .unwrap();

    expect(result).toMatchObject({ id: "vm1", utilization: undefined });
  });

  test("updateVMLabels invalidates VmLabels so getVMLabels refetches", async () => {
    const counts = { total: 3 };
    const api = makeFakeApi(counts);
    const store = createStore(api);

    await store.dispatch(vmsEndpoints.endpoints.getVMLabels.initiate());
    expect(api.getLatestVMLabels).toHaveBeenCalledTimes(1);

    await store
      .dispatch(
        vmsEndpoints.endpoints.updateVMLabels.initiate({
          label: "prod",
          add: ["vm1"],
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(api.getLatestVMLabels).toHaveBeenCalledTimes(2);
    });
  });
});

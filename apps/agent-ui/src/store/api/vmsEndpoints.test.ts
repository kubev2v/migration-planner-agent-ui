import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { vmsEndpoints } from "./vmsEndpoints";

/**
 * The VM table (getVMs) and the assessment inventory (getInventory) are two
 * independent cache entries. This suite proves a single exclusion mutation
 * invalidates both, so their counts can never diverge — the WP-3 regression
 * lock that mirrors the group-header test.
 */

const VMS_ARG = {
  byExpression: "",
  sort: [] as string[],
  page: 1,
  pageSize: 20,
};

function makeFakeApi(counts: { total: number }): AgentApiClient {
  return {
    configuration: { basePath: "http://localhost/agent/api/v2" },
    listLatestVirtualMachines: vi.fn(async () => ({
      virtualMachines: [{ id: "vm1" }, { id: "vm2" }],
      total: counts.total,
      pageCount: 1,
    })),
    batchUpdateLatestVMExclusion: vi.fn(async () => undefined),
    updateLatestLabelVMs: vi.fn(async () => undefined),
    getLatestVMLabels: vi.fn(async () => ({ labels: ["prod"] })),
  } as unknown as AgentApiClient;
}

/** Stub GET /inventory so getInventory (raw fetch) returns tracked totals. */
function stubInventoryFetch(counts: { total: number }) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      vcenter_id: "vc1",
      clusters: {},
      vcenter: { vms: { total: counts.total } },
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("vmsEndpoints tag invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("an exclusion mutation refetches both the VM list and the inventory", async () => {
    const counts = { total: 7 };
    const fetchMock = stubInventoryFetch(counts);
    const api = makeFakeApi(counts);
    const store = createStore(api);

    // Initial load: table and inventory both observe 7.
    await store.dispatch(vmsEndpoints.endpoints.getVMs.initiate(VMS_ARG));
    await store.dispatch(vmsEndpoints.endpoints.getInventory.initiate());

    const vmsTotal = () =>
      vmsEndpoints.endpoints.getVMs.select(VMS_ARG)(store.getState()).data
        ?.total;

    expect(vmsTotal()).toBe(7);
    expect(api.listLatestVirtualMachines).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

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
      expect(api.listLatestVirtualMachines).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(vmsTotal()).toBe(5);
    });
  });

  test("updateVMLabels invalidates VmLabels so getVMLabels refetches", async () => {
    const counts = { total: 3 };
    stubInventoryFetch(counts);
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

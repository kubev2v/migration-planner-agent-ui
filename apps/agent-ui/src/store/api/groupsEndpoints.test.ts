import { describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { agentApiSlice } from "./agentApiSlice";
import { groupsEndpoints } from "./groupsEndpoints";

/**
 * A fake SDK client whose returned totals track a mutable `counts` object, so a
 * test can simulate a group-membership change (7 -> 5) and then assert the
 * queries refetch fresh data.
 */
function makeFakeApi(counts: { total: number }): AgentApiClient {
  return {
    getLatestGroup: vi.fn(async () => ({
      group: { id: "g1", name: "create-group-1", filter: "id in ['a','b']" },
      total: counts.total,
      pageCount: 1,
      vms: [],
      inventory: {
        vcenter_id: "vc1",
        clusters: {},
        vms: { total: counts.total },
      },
    })),
    listLatestVirtualMachines: vi.fn(async () => ({
      virtualMachines: [],
      total: counts.total,
    })),
  } as unknown as AgentApiClient;
}

const VMS_ARG = {
  groupId: "g1",
  groupFilter: "id in ['a','b']",
  byExpression: "",
  sort: [] as string[],
  page: 1,
  pageSize: 20,
};

describe("groupsEndpoints tag invalidation", () => {
  test("getGroup and getGroupVMs both refetch after group tags are invalidated", async () => {
    const counts = { total: 7 };
    const store = createStore(makeFakeApi(counts));

    // Initial load: header (getGroup) and table (getGroupVMs) both see 7.
    await store.dispatch(
      groupsEndpoints.endpoints.getGroup.initiate({ groupId: "g1" }),
    );
    await store.dispatch(
      groupsEndpoints.endpoints.getGroupVMs.initiate(VMS_ARG),
    );

    const groupTotal = () =>
      groupsEndpoints.endpoints.getGroup.select({ groupId: "g1" })(
        store.getState(),
      ).data?.total;
    const vmsTotal = () =>
      groupsEndpoints.endpoints.getGroupVMs.select(VMS_ARG)(store.getState())
        .data?.total;

    expect(groupTotal()).toBe(7);
    expect(vmsTotal()).toBe(7);

    // Simulate removing 2 VMs from the group, then invalidate exactly what
    // reloadGroupMembership invalidates.
    counts.total = 5;
    store.dispatch(
      agentApiSlice.util.invalidateTags([
        { type: "Group", id: "g1" },
        { type: "GroupVms", id: "g1" },
        { type: "GroupInventory", id: "g1" },
      ]),
    );

    // Both the header source and the table source refetch to 5 — they cannot
    // diverge because they share one invalidation.
    await vi.waitFor(() => {
      expect(groupTotal()).toBe(5);
      expect(vmsTotal()).toBe(5);
    });
  });

  test("updateGroupName invalidates the Group tag", async () => {
    const counts = { total: 3 };
    const api = makeFakeApi(counts);
    (api as unknown as { updateLatestGroup: unknown }).updateLatestGroup =
      vi.fn(async () => ({ id: "g1", name: "renamed" }));
    const store = createStore(api);

    await store.dispatch(
      groupsEndpoints.endpoints.getGroup.initiate({ groupId: "g1" }),
    );
    (api.getLatestGroup as ReturnType<typeof vi.fn>).mockClear();

    await store
      .dispatch(
        groupsEndpoints.endpoints.updateGroupName.initiate({
          groupId: "g1",
          name: "renamed",
        }),
      )
      .unwrap();

    // Invalidating Group refetches getGroup.
    await vi.waitFor(() => {
      expect(api.getLatestGroup).toHaveBeenCalled();
    });
  });
});

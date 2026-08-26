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

  test("creating then deleting a group refetches listGroups from one invalidation", async () => {
    const groups = [
      { id: "g1", name: "prod", filter: "id in ['a']" },
      { id: "g2", name: "dev", filter: "id in ['b']" },
    ];
    const api = {
      listLatestGroups: vi.fn(async () => ({
        groups,
        total: groups.length,
        page: 1,
        pageCount: 1,
      })),
      createLatestGroup: vi.fn(async () => ({
        id: "g3",
        name: "new",
        filter: "id in ['c']",
      })),
      deleteLatestGroup: vi.fn(async () => undefined),
    } as unknown as AgentApiClient;
    const store = createStore(api);

    await store.dispatch(
      groupsEndpoints.endpoints.listGroups.initiate({ page: 1, pageSize: 20 }),
    );
    expect(api.listLatestGroups).toHaveBeenCalledTimes(1);

    // Create invalidates Group:LIST -> the list refetches.
    await store
      .dispatch(
        groupsEndpoints.endpoints.createGroup.initiate({
          createGroupRequest: { name: "new", filter: "id in ['c']" },
        }),
      )
      .unwrap();
    await vi.waitFor(() => {
      expect(api.listLatestGroups).toHaveBeenCalledTimes(2);
    });

    // Delete also invalidates Group:LIST -> the list refetches again.
    await store
      .dispatch(
        groupsEndpoints.endpoints.deleteGroup.initiate({ groupId: "g1" }),
      )
      .unwrap();
    await vi.waitFor(() => {
      expect(api.listLatestGroups).toHaveBeenCalledTimes(3);
    });
  });

  test("getAllGroups provides Group:LIST and refetches after a create", async () => {
    const groups = [{ id: "g1", name: "prod", filter: "id in ['a']" }];
    const api = {
      listLatestGroups: vi.fn(async () => ({
        groups,
        total: groups.length,
        page: 1,
        pageCount: 1,
      })),
      createLatestGroup: vi.fn(async () => ({
        id: "g2",
        name: "new",
        filter: "id in ['b']",
      })),
    } as unknown as AgentApiClient;
    const store = createStore(api);

    await store.dispatch(
      groupsEndpoints.endpoints.getAllGroups.initiate(undefined),
    );
    expect(api.listLatestGroups).toHaveBeenCalledTimes(1);

    const allGroupIds = () =>
      groupsEndpoints.endpoints.getAllGroups
        .select(undefined)(store.getState())
        .data?.map((group) => group.id);
    expect(allGroupIds()).toEqual(["g1"]);

    // Creating a group invalidates Group:LIST, so the all-groups cache entry
    // refetches and picks up the new group — no separate cache to go stale.
    groups.push({ id: "g2", name: "new", filter: "id in ['b']" });
    await store
      .dispatch(
        groupsEndpoints.endpoints.createGroup.initiate({
          createGroupRequest: { name: "new", filter: "id in ['b']" },
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(api.listLatestGroups).toHaveBeenCalledTimes(2);
      expect(allGroupIds()).toEqual(["g1", "g2"]);
    });
  });

  test("changeGroupMembership refetches both the list and the group detail", async () => {
    const counts = { total: 4 };
    const api = makeFakeApi(counts) as unknown as {
      listLatestGroups: unknown;
      updateLatestGroup: unknown;
    } & AgentApiClient;
    api.listLatestGroups = vi.fn(async () => ({
      groups: [{ id: "g1", name: "prod", filter: "id in ['a','b']" }],
      total: 1,
      page: 1,
      pageCount: 1,
    }));
    api.updateLatestGroup = vi.fn(async () => ({
      id: "g1",
      name: "prod",
      filter: "id in ['a']",
    }));
    const store = createStore(api);

    await store.dispatch(
      groupsEndpoints.endpoints.listGroups.initiate({ page: 1, pageSize: 20 }),
    );
    await store.dispatch(
      groupsEndpoints.endpoints.getGroup.initiate({ groupId: "g1" }),
    );
    (api.listLatestGroups as ReturnType<typeof vi.fn>).mockClear();
    (api.getLatestGroup as ReturnType<typeof vi.fn>).mockClear();

    // Removing a VM from the group must refetch the list AND the group detail
    // (header count) from the single membership invalidation.
    await store
      .dispatch(
        groupsEndpoints.endpoints.changeGroupMembership.initiate({
          groupId: "g1",
          filter: "id in ['a']",
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(api.listLatestGroups).toHaveBeenCalled();
      expect(api.getLatestGroup).toHaveBeenCalled();
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

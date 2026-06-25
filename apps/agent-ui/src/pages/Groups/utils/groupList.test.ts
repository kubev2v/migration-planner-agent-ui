import { describe, expect, it, vi } from "vitest";
import { fetchAllGroups, invalidateAllGroupsCache } from "./groupList";

describe("fetchAllGroups cache", () => {
  it("reuses cached results within the TTL", async () => {
    const agentApi = {
      listGroups: vi.fn().mockResolvedValue({
        groups: [{ id: "1", name: "group-a", filter: "id = 'vm-1'" }],
        pageCount: 1,
      }),
    };

    const first = await fetchAllGroups(agentApi);
    const second = await fetchAllGroups(agentApi);

    expect(first).toEqual(second);
    expect(agentApi.listGroups).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache for name searches", async () => {
    const agentApi = {
      listGroups: vi.fn().mockResolvedValue({
        groups: [],
        pageCount: 1,
      }),
    };

    await fetchAllGroups(agentApi, { byName: "prod" });
    await fetchAllGroups(agentApi, { byName: "prod" });

    expect(agentApi.listGroups).toHaveBeenCalledTimes(2);
  });

  it("refetches after cache invalidation", async () => {
    const agentApi = {
      listGroups: vi.fn().mockResolvedValue({
        groups: [{ id: "1", name: "group-a", filter: "id = 'vm-1'" }],
        pageCount: 1,
      }),
    };

    await fetchAllGroups(agentApi);
    invalidateAllGroupsCache(agentApi);
    await fetchAllGroups(agentApi);

    expect(agentApi.listGroups).toHaveBeenCalledTimes(2);
  });
});

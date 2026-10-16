import { describe, expect, it, vi } from "vitest";
import { fetchAllGroupsPages } from "./groupList";

describe("fetchAllGroupsPages", () => {
  it("accumulates groups across every page", async () => {
    const agentApi = {
      listLatestGroups: vi
        .fn()
        .mockResolvedValueOnce({
          groups: [{ id: "1", name: "group-a", filter: "id = 'vm-1'" }],
          pageCount: 3,
        })
        .mockResolvedValueOnce({
          groups: [{ id: "2", name: "group-b", filter: "id = 'vm-2'" }],
          pageCount: 3,
        })
        .mockResolvedValueOnce({
          groups: [{ id: "3", name: "group-c", filter: "id = 'vm-3'" }],
          pageCount: 3,
        }),
    };

    const groups = await fetchAllGroupsPages(agentApi);

    expect(groups.map((group) => group.id)).toEqual(["1", "2", "3"]);
    expect(agentApi.listLatestGroups).toHaveBeenCalledTimes(3);
    expect(agentApi.listLatestGroups).toHaveBeenNthCalledWith(1, {
      byName: undefined,
      page: 1,
      pageSize: 100,
    });
    expect(agentApi.listLatestGroups).toHaveBeenNthCalledWith(3, {
      byName: undefined,
      page: 3,
      pageSize: 100,
    });
  });

  it("passes the byName filter through to every page request", async () => {
    const agentApi = {
      listLatestGroups: vi.fn().mockResolvedValue({
        groups: [],
        pageCount: 1,
      }),
    };

    await fetchAllGroupsPages(agentApi, { byName: "prod" });

    expect(agentApi.listLatestGroups).toHaveBeenCalledWith({
      byName: "prod",
      page: 1,
      pageSize: 100,
    });
  });

  it("tolerates a missing pageCount and empty group pages", async () => {
    const agentApi = {
      listLatestGroups: vi.fn().mockResolvedValue({}),
    };

    const groups = await fetchAllGroupsPages(agentApi);

    expect(groups).toEqual([]);
    expect(agentApi.listLatestGroups).toHaveBeenCalledTimes(1);
  });
});

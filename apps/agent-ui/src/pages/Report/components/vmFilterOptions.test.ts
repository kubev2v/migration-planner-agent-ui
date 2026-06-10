import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRefreshVmTableFilterOptions,
  FILTER_OPTIONS_REFRESH_TTL_MS,
  mergeGroupNamesIntoFilterOptions,
} from "./vmFilterOptions";

describe("createRefreshVmTableFilterOptions", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("skips refresh within the TTL unless forced", async () => {
    vi.useFakeTimers();

    const agentApi = {
      getVMsFilterOptions: vi.fn().mockResolvedValue({
        clusters: [],
        datacenters: [],
        concernLabels: [],
        concernCategories: [],
      }),
      getVMLabels: vi.fn().mockResolvedValue({ labels: [] }),
      listGroups: vi.fn().mockResolvedValue({ groups: [], pageCount: 1 }),
    };
    const setOptions = vi.fn();
    const refresh = createRefreshVmTableFilterOptions(
      agentApi as never,
      setOptions,
    );

    await refresh();
    await refresh();
    expect(setOptions).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(FILTER_OPTIONS_REFRESH_TTL_MS);
    await refresh();
    expect(setOptions).toHaveBeenCalledTimes(2);

    await refresh({ force: true });
    expect(setOptions).toHaveBeenCalledTimes(3);
  });

  it("allows immediate retry after a failed refresh", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const agentApi = {
      getVMsFilterOptions: vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue({
          clusters: [],
          datacenters: [],
          concernLabels: [],
          concernCategories: [],
        }),
      getVMLabels: vi.fn().mockResolvedValue({ labels: [] }),
      listGroups: vi.fn().mockResolvedValue({ groups: [], pageCount: 1 }),
    };
    const setOptions = vi.fn();
    const refresh = createRefreshVmTableFilterOptions(
      agentApi as never,
      setOptions,
    );

    await refresh();
    await refresh();

    expect(setOptions).toHaveBeenCalledTimes(1);
    expect(agentApi.getVMsFilterOptions).toHaveBeenCalledTimes(2);
  });
});

describe("mergeGroupNamesIntoFilterOptions", () => {
  it("adds membership group names to empty filter options", () => {
    expect(
      mergeGroupNamesIntoFilterOptions(undefined, ["group2", "group1"]),
    ).toEqual({
      clusters: [],
      datacenters: [],
      concernLabels: [],
      concernCategories: [],
      vmLabels: [],
      groups: ["group1", "group2"],
    });
  });

  it("merges and deduplicates group names", () => {
    expect(
      mergeGroupNamesIntoFilterOptions(
        {
          clusters: [],
          datacenters: [],
          concernLabels: [],
          concernCategories: [],
          vmLabels: [],
          groups: ["group1"],
        },
        ["group2", "group1"],
      ).groups,
    ).toEqual(["group1", "group2"]);
  });
});

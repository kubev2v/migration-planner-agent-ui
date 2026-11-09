import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { agentApiSlice } from "./agentApiSlice";
import { comparisonEndpoints } from "./comparisonEndpoints";

/**
 * The collection list and the summary comparison are independent cache entries
 * that both provide the `Collections` tag. A completed report invalidates that
 * one tag and every dependent entry refetches together — the report-comparison
 * analogue of the WP-3 exclusion regression lock.
 */

const COMPARE_ARG = { aId: "c1", bId: "c2" };

function makeFakeApi(): AgentApiClient {
  return {
    listCollections: vi.fn(async () => ({
      collections: [
        { id: "c2", createdAt: new Date("2026-02-01T00:00:00Z") },
        { id: "c1", createdAt: new Date("2026-01-01T00:00:00Z") },
      ],
    })),
    compareCollections: vi.fn(async () => ({
      collections: [],
      diff: {},
    })),
  } as unknown as AgentApiClient;
}

describe("comparisonEndpoints tag invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("invalidating Collections refetches the list and the comparison", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      comparisonEndpoints.endpoints.listCollections.initiate(),
    );
    await store.dispatch(
      comparisonEndpoints.endpoints.compareCollections.initiate(COMPARE_ARG),
    );

    expect(api.listCollections).toHaveBeenCalledTimes(1);
    expect(api.compareCollections).toHaveBeenCalledTimes(1);

    // A completed report invalidates the shared tag.
    store.dispatch(agentApiSlice.util.invalidateTags(["Collections"]));

    await vi.waitFor(() => {
      expect(api.listCollections).toHaveBeenCalledTimes(2);
      expect(api.compareCollections).toHaveBeenCalledTimes(2);
    });
  });

  test("listCollections returns collections sorted newest-first", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      comparisonEndpoints.endpoints.listCollections.initiate(),
    );

    const collections = comparisonEndpoints.endpoints.listCollections.select()(
      store.getState(),
    ).data;

    expect(collections?.map((collection) => collection.id)).toEqual([
      "c2",
      "c1",
    ]);
  });
});

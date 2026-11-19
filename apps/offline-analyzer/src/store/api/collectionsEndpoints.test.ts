import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { agentApiSlice } from "./agentApiSlice";
import { collectionsEndpoints } from "./collectionsEndpoints";

/**
 * A completed report invalidates the `Collections` tag and refreshes the
 * collection list used by the analyzer views.
 */

function makeFakeApi(): AgentApiClient {
  return {
    listCollections: vi.fn(async () => ({
      collections: [
        { id: "c2", createdAt: new Date("2026-02-01T00:00:00Z") },
        { id: "c1", createdAt: new Date("2026-01-01T00:00:00Z") },
      ],
    })),
  } as unknown as AgentApiClient;
}

describe("collectionsEndpoints tag invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("invalidating Collections refetches the list", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      collectionsEndpoints.endpoints.listCollections.initiate(),
    );

    expect(api.listCollections).toHaveBeenCalledTimes(1);

    // A completed report invalidates the shared tag.
    store.dispatch(agentApiSlice.util.invalidateTags(["Collections"]));

    await vi.waitFor(() => {
      expect(api.listCollections).toHaveBeenCalledTimes(2);
    });
  });

  test("listCollections returns collections sorted newest-first", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      collectionsEndpoints.endpoints.listCollections.initiate(),
    );

    const collections = collectionsEndpoints.endpoints.listCollections.select()(
      store.getState(),
    ).data;

    expect(collections?.map((collection) => collection.id)).toEqual([
      "c2",
      "c1",
    ]);
  });
});

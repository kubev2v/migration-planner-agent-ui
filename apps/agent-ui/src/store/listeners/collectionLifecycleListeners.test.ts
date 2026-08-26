import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { MAX_COLLECTOR_POLL_FAILURES } from "../../common/report/collectorMessages";
import { createStore } from "../index";
import { startCollection } from "../thunks/startCollection";

/**
 * These tests drive the collection lifecycle through a real store (so the
 * listener middleware, thunk `extra` and slice are all wired exactly as in the
 * app) and assert the resulting slice state. Tag invalidation on completion is
 * covered separately in `store/api/lifecycleEndpoints.test.ts`.
 */

const NEWER_COLLECTION = {
  id: "c2",
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
};

/**
 * A fake SDK client. `getCollectorStatus` defaults to "ready" so the
 * `appInitialized` resume listener is a no-op; individual tests override it.
 */
function makeFakeApi(): AgentApiClient {
  return {
    getCollectorStatus: vi.fn(async () => ({ status: "ready" })),
    listCollections: vi.fn(async () => ({ collections: [NEWER_COLLECTION] })),
    startCollector: vi.fn(async () => ({ status: "collecting" })),
  } as unknown as AgentApiClient;
}

function dispatchStarted(
  store: ReturnType<typeof createStore>,
  overrides: Partial<Parameters<typeof startCollection.fulfilled>[0]> = {},
) {
  return store.dispatch(
    startCollection.fulfilled(
      {
        previousCollectionId: null,
        previousCollectionCreatedAt: null,
        status: "collecting",
        immediateCollected: false,
        ...overrides,
      },
      "req-1",
      undefined,
    ),
  );
}

describe("collection lifecycle listeners", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("polling to a collected status ends the run and shows the ready alert", async () => {
    const api = makeFakeApi();
    // Not in progress at startup (resume no-op); the poll immediately observes
    // "collected", then a newer collection settles the run.
    vi.mocked(api.getCollectorStatus).mockResolvedValue({
      status: "collected",
    });
    const store = createStore(api);

    dispatchStarted(store);

    await vi.waitFor(() => {
      expect(store.getState().collectionLifecycle.showReadyAlert).toBe(true);
    });

    const state = store.getState().collectionLifecycle;
    expect(state.isCollecting).toBe(false);
    expect(state.collectorStatus).toBeNull();
    expect(state.collectError).toBeNull();
  });

  test("gives up with an error after MAX_COLLECTOR_POLL_FAILURES failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    const api = makeFakeApi();
    vi.mocked(api.getCollectorStatus).mockRejectedValue(
      new Error("collector unreachable"),
    );
    const store = createStore(api);

    dispatchStarted(store);

    // Drain the poll loop: each failure below the cap schedules a retry timer.
    await vi.runAllTimersAsync();

    const state = store.getState().collectionLifecycle;
    expect(state.isCollecting).toBe(false);
    expect(state.collectError).toBe("collector unreachable");
    // The poll makes exactly MAX_COLLECTOR_POLL_FAILURES attempts; the extra
    // call is the `appInitialized` resume check that runs when the store builds.
    expect(api.getCollectorStatus).toHaveBeenCalledTimes(
      MAX_COLLECTOR_POLL_FAILURES + 1,
    );
  });

  test("resumes an in-progress run detected at app startup", async () => {
    const api = makeFakeApi();
    vi.mocked(api.getCollectorStatus)
      // appInitialized sees a run already in progress...
      .mockResolvedValueOnce({ status: "collecting" })
      // ...then the resumed poll observes a terminal error.
      .mockResolvedValue({ status: "error", error: "resumed run failed" });

    const store = createStore(api);

    await vi.waitFor(() => {
      expect(store.getState().collectionLifecycle.collectError).toBe(
        "resumed run failed",
      );
    });
    expect(store.getState().collectionLifecycle.isCollecting).toBe(false);
  });
});

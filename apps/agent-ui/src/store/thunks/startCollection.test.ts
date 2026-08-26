import { describe, expect, test, vi } from "vitest";
import type { SdkExtra } from "../baseQuery";
import { startCollection } from "./startCollection";

/**
 * The thunk is exercised in isolation by invoking it directly with a fake
 * dispatch / getState / extra, so these tests assert only its own contract (the
 * fulfilled payload or the rejectWithValue message) without the listener
 * middleware that reacts to `startCollection.fulfilled`.
 */
function runThunk(agentApi: unknown) {
  const dispatch = vi.fn();
  const getState = vi.fn(() => ({}));
  const extra = { agentApi } as unknown as SdkExtra;
  return startCollection()(dispatch, getState, extra);
}

const PREVIOUS_COLLECTION = {
  id: "c1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("startCollection thunk", () => {
  test("resolves with the previous collection and in-progress status", async () => {
    const agentApi = {
      listCollections: vi.fn(async () => ({
        collections: [PREVIOUS_COLLECTION],
      })),
      startCollector: vi.fn(async () => ({ status: "collecting" })),
    };

    const action = await runThunk(agentApi);

    expect(startCollection.fulfilled.match(action)).toBe(true);
    expect(action.payload).toEqual({
      previousCollectionId: "c1",
      previousCollectionCreatedAt: PREVIOUS_COLLECTION.createdAt.getTime(),
      status: "collecting",
      immediateCollected: false,
    });
  });

  test("flags an immediate 'collected' result", async () => {
    const agentApi = {
      listCollections: vi.fn(async () => ({ collections: [] })),
      startCollector: vi.fn(async () => ({ status: "collected" })),
    };

    const action = await runThunk(agentApi);

    expect(startCollection.fulfilled.match(action)).toBe(true);
    expect(action.payload).toEqual({
      previousCollectionId: null,
      previousCollectionCreatedAt: null,
      status: "collected",
      immediateCollected: true,
    });
  });

  test("rejects with the server message when the collector reports an error", async () => {
    const agentApi = {
      listCollections: vi.fn(async () => ({ collections: [] })),
      startCollector: vi.fn(async () => ({ status: "error", error: "nope" })),
    };

    const action = await runThunk(agentApi);

    expect(startCollection.rejected.match(action)).toBe(true);
    expect(action.payload).toEqual({ message: "nope" });
  });

  test("rejects with a friendly message for an unexpected terminal status", async () => {
    const agentApi = {
      listCollections: vi.fn(async () => ({ collections: [] })),
      startCollector: vi.fn(async () => ({ status: "ready" })),
    };

    const action = await runThunk(agentApi);

    expect(startCollection.rejected.match(action)).toBe(true);
    expect(action.payload).toEqual({
      message: "The new report was cancelled or interrupted.",
    });
  });

  test("rejects with the parsed error when starting the collector throws", async () => {
    const agentApi = {
      listCollections: vi.fn(async () => ({ collections: [] })),
      startCollector: vi.fn(async () => {
        throw new Error("network down");
      }),
    };

    const action = await runThunk(agentApi);

    expect(startCollection.rejected.match(action)).toBe(true);
    expect(action.payload).toEqual({ message: "network down" });
  });
});

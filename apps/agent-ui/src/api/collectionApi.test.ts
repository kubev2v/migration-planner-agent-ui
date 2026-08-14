import { describe, expect, it, vi } from "vitest";
import {
  resolveWaitForNewerCollectionOptions,
  waitForNewerCollection,
} from "./collectionApi";

describe("resolveWaitForNewerCollectionOptions", () => {
  it("applies defaults for omitted options", () => {
    expect(resolveWaitForNewerCollectionOptions()).toEqual({
      timeoutMs: 90_000,
      intervalMs: 1_000,
    });
  });

  it.each([
    ["timeoutMs", { timeoutMs: -1 }],
    ["timeoutMs", { timeoutMs: Number.POSITIVE_INFINITY }],
    ["intervalMs", { intervalMs: 0 }],
    ["intervalMs", { intervalMs: -5 }],
    ["intervalMs", { intervalMs: Number.POSITIVE_INFINITY }],
  ])("rejects invalid %s", (_label, options) => {
    expect(() => resolveWaitForNewerCollectionOptions(options)).toThrow(
      RangeError,
    );
  });
});

describe("waitForNewerCollection", () => {
  it("returns immediately when a newer collection is already available", async () => {
    const newer = {
      id: "c2",
      name: "new",
      createdAt: new Date("2026-03-28T18:00:00.000Z"),
    };
    const agentApi = {
      listCollections: vi.fn().mockResolvedValue({
        collections: [newer],
      }),
    };

    const result = await waitForNewerCollection(agentApi as never, {
      id: "c1",
      createdAt: new Date("2026-03-28T15:00:00.000Z"),
    });

    expect(result).toEqual({ collection: newer, foundNewer: true });
    expect(agentApi.listCollections).toHaveBeenCalledTimes(1);
  });

  it("waits until a newer collection appears", async () => {
    const older = {
      id: "c1",
      name: "old",
      createdAt: new Date("2026-03-28T15:00:00.000Z"),
    };
    const newer = {
      id: "c2",
      name: "new",
      createdAt: new Date("2026-03-28T18:00:00.000Z"),
    };
    const agentApi = {
      listCollections: vi
        .fn()
        .mockResolvedValueOnce({ collections: [older] })
        .mockResolvedValueOnce({ collections: [newer] }),
    };

    const result = await waitForNewerCollection(
      agentApi as never,
      { id: older.id, createdAt: older.createdAt },
      { intervalMs: 1, timeoutMs: 1000 },
    );

    expect(result).toEqual({ collection: newer, foundNewer: true });
    expect(agentApi.listCollections).toHaveBeenCalledTimes(2);
  });

  it("returns foundNewer false when timeout elapses without a newer collection", async () => {
    const older = {
      id: "c1",
      name: "old",
      createdAt: new Date("2026-03-28T15:00:00.000Z"),
    };
    const agentApi = {
      listCollections: vi.fn().mockResolvedValue({ collections: [older] }),
    };

    const result = await waitForNewerCollection(
      agentApi as never,
      { id: older.id, createdAt: older.createdAt },
      { intervalMs: 1, timeoutMs: 10 },
    );

    expect(result).toEqual({ collection: older, foundNewer: false });
  });

  it("rejects invalid options before polling begins", async () => {
    const agentApi = {
      listCollections: vi.fn(),
    };

    await expect(
      waitForNewerCollection(agentApi as never, null, { intervalMs: 0 }),
    ).rejects.toThrow(RangeError);
    expect(agentApi.listCollections).not.toHaveBeenCalled();
  });
});

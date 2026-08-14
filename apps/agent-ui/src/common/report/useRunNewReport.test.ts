import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRunNewReport } from "./useRunNewReport";

describe("useRunNewReport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for a newer collection before refreshing page data", async () => {
    vi.useFakeTimers();

    const onCompleted = vi.fn().mockResolvedValue(undefined);
    const olderCreatedAt = new Date("2026-03-28T15:45:00.000Z");
    const newerCreatedAt = new Date("2026-03-28T18:00:00.000Z");
    const older = { id: "c1", name: "old", createdAt: olderCreatedAt };
    const newer = { id: "c2", name: "new", createdAt: newerCreatedAt };
    let settleCalls = 0;
    const listCollections = vi.fn(async () => {
      if (listCollections.mock.calls.length <= 2) {
        return { collections: [older] };
      }
      settleCalls += 1;
      if (settleCalls === 1) {
        return { collections: [older] };
      }
      if (settleCalls === 2) {
        return { collections: [newer] };
      }
      throw new Error(
        `Unexpected listCollections call #${listCollections.mock.calls.length}`,
      );
    });
    const startCollector = vi.fn().mockResolvedValue({ status: "collected" });
    const agentApi = {
      listCollections,
      getCollectorStatus: vi.fn().mockResolvedValue({ status: "collected" }),
      startCollector,
    };

    const { result } = renderHook(() =>
      useRunNewReport(agentApi as never, {
        onCompleted,
        collectionWaitTimeoutMs: 5_000,
        collectionWaitIntervalMs: 1_000,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      const runPromise = result.current.confirmRun();
      await vi.runAllTimersAsync();
      await runPromise;
    });

    expect(startCollector).toHaveBeenCalledTimes(1);
    expect(settleCalls).toBe(2);
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(result.current.showReadyAlert).toBe(true);
    expect(result.current.isCollecting).toBe(false);
  });

  it("does not show success when a newer collection never appears", async () => {
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    const createdAt = new Date("2026-03-28T15:45:00.000Z");
    const agentApi = {
      listCollections: vi.fn().mockResolvedValue({
        collections: [{ id: "c1", name: "same", createdAt }],
      }),
      getCollectorStatus: vi.fn().mockResolvedValue({ status: "collected" }),
      startCollector: vi.fn().mockResolvedValue({ status: "collected" }),
    };

    const { result } = renderHook(() =>
      useRunNewReport(agentApi as never, {
        onCompleted,
        collectionWaitTimeoutMs: 10,
        collectionWaitIntervalMs: 1,
      }),
    );

    await act(async () => {
      await expect(result.current.confirmRun()).rejects.toThrow(
        /updated collection is not available yet/i,
      );
    });

    expect(onCompleted).not.toHaveBeenCalled();
    expect(result.current.showReadyAlert).toBe(false);
    expect(result.current.collectError).toMatch(
      /updated collection is not available yet/i,
    );
  });

  it("surfaces an error when collection stops in ready state", async () => {
    vi.useFakeTimers();

    const onCompleted = vi.fn().mockResolvedValue(undefined);
    const createdAt = new Date("2026-03-28T15:45:00.000Z");
    const agentApi = {
      listCollections: vi.fn().mockResolvedValue({
        collections: [{ id: "c1", name: "latest", createdAt }],
      }),
      getCollectorStatus: vi
        .fn()
        .mockResolvedValueOnce({ status: "collected" })
        .mockResolvedValueOnce({ status: "collecting" })
        .mockResolvedValue({ status: "ready" }),
      startCollector: vi.fn().mockResolvedValue({ status: "collecting" }),
    };

    const { result } = renderHook(() =>
      useRunNewReport(agentApi as never, { onCompleted }),
    );

    await act(async () => {
      await result.current.confirmRun();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
      await Promise.resolve();
    });

    expect(result.current.isCollecting).toBe(false);
    expect(result.current.collectError).toMatch(/cancelled or interrupted/i);
    expect(onCompleted).not.toHaveBeenCalled();
  });
});

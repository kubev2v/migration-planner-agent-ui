import { describe, expect, it } from "vitest";
import {
  shouldApplyStorageOffloadResults,
  waitForPendingResultsWork,
} from "./storageOffloadResultsFlow";

describe("shouldApplyStorageOffloadResults", () => {
  it("allows applying results on the results page when not starting over", () => {
    expect(shouldApplyStorageOffloadResults("results", false)).toBe(true);
  });

  it("blocks applying results after start over has begun", () => {
    expect(shouldApplyStorageOffloadResults("results", true)).toBe(false);
  });

  it("blocks applying results once the page has been reset to empty", () => {
    expect(shouldApplyStorageOffloadResults("empty", false)).toBe(false);
  });
});

describe("waitForPendingResultsWork", () => {
  it("waits for both in-flight load and benchmark completion work", async () => {
    let loadDone = false;
    let benchmarkDone = false;

    const loadResultsInFlight = new Promise<void>((resolve) => {
      setTimeout(() => {
        loadDone = true;
        resolve();
      }, 20);
    });
    const benchmarkCompleteInFlight = new Promise<void>((resolve) => {
      setTimeout(() => {
        benchmarkDone = true;
        resolve();
      }, 10);
    });

    await waitForPendingResultsWork(
      loadResultsInFlight,
      benchmarkCompleteInFlight,
    );

    expect(loadDone).toBe(true);
    expect(benchmarkDone).toBe(true);
  });

  it("ignores rejected in-flight work", async () => {
    await expect(
      waitForPendingResultsWork(
        Promise.reject(new Error("load failed")),
        Promise.reject(new Error("benchmark failed")),
      ),
    ).resolves.toBeUndefined();
  });
});

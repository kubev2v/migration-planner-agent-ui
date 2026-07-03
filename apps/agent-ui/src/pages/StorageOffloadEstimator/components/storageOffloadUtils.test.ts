import { describe, expect, it } from "vitest";
import type {
  ForecastPairStatus,
  ForecastRun,
  SelectedPair,
} from "../utils/forecasterTypes";
import {
  filterPairsByDatastoreName,
  findLivePairStatus,
  getExtraRunningPairs,
  getPairStateDisplay,
  groupRunsBySession,
  indexRunsByPairName,
  isPairCancelable,
  isPairCancelled,
  isPairRerunnable,
} from "./storageOffloadUtils";

const pairs: SelectedPair[] = [
  {
    id: "pair-a",
    name: "pair-a",
    sourceDatastore: "MOCK-DS-A",
    targetDatastore: "MOCK-DS-B",
  },
];

describe("storageOffloadUtils", () => {
  it("indexes runs by pair name", () => {
    const runs: ForecastRun[] = [
      {
        id: 1,
        sessionId: 1,
        pairName: "pair-a",
        sourceDatastore: "MOCK-DS-A",
        targetDatastore: "MOCK-DS-B",
        iteration: 1,
        diskSizeGb: 10,
        durationSec: 1,
        throughputMbps: 1,
        createdAt: "2026-06-10T08:00:00.000Z",
      },
    ];
    const lookup = indexRunsByPairName(runs);
    expect(lookup("pair-a")).toHaveLength(1);
    expect(lookup("non-existent")).toHaveLength(0);
  });

  it("finds live status by name or source/target", () => {
    const live: ForecastPairStatus[] = [
      {
        pairName: "MOCK-DS-A-to-MOCK-DS-B",
        sourceDatastore: "MOCK-DS-A",
        targetDatastore: "MOCK-DS-B",
        state: "running",
        completedRuns: 1,
        totalRuns: 2,
      },
    ];
    expect(findLivePairStatus(pairs[0], live)?.state).toBe("running");
  });

  it("adds extra running pairs not in the saved list", () => {
    const extra = getExtraRunningPairs(pairs, {
      state: "running",
      pairs: [
        {
          pairName: "other",
          sourceDatastore: "MOCK-DS-C",
          targetDatastore: "MOCK-DS-D",
          state: "preparing",
          completedRuns: 0,
          totalRuns: 2,
        },
      ],
    });
    expect(extra).toHaveLength(1);
    expect(extra[0].sourceDatastore).toBe("MOCK-DS-C");
  });

  it("does not add canceled or errored pairs as extra rows", () => {
    const status = {
      state: "running" as const,
      pairs: [
        {
          pairName: "canceled-pair",
          sourceDatastore: "MOCK-DS-C",
          targetDatastore: "MOCK-DS-D",
          state: "canceled" as const,
          completedRuns: 0,
          totalRuns: 2,
        },
        {
          pairName: "error-pair",
          sourceDatastore: "MOCK-DS-E",
          targetDatastore: "MOCK-DS-F",
          state: "error" as const,
          error: "failed",
          completedRuns: 0,
          totalRuns: 2,
        },
      ],
    };
    expect(getExtraRunningPairs(pairs, status)).toHaveLength(0);
  });

  it("filters pairs by datastore name", () => {
    const filtered = filterPairsByDatastoreName(pairs, "mock-ds-a");
    expect(filtered).toHaveLength(1);
    expect(filterPairsByDatastoreName(pairs, "missing")).toHaveLength(0);
  });

  it("identifies cancelable pair states while a benchmark is active", () => {
    const live: ForecastPairStatus = {
      pairName: "pair-a",
      sourceDatastore: "MOCK-DS-A",
      targetDatastore: "MOCK-DS-B",
      state: "preparing",
      completedRuns: 0,
      totalRuns: 2,
    };
    expect(isPairCancelable(live, false)).toBe(true);
    expect(isPairCancelable({ ...live, state: "completed" }, false)).toBe(
      false,
    );
    expect(isPairCancelable(live, true)).toBe(false);
  });

  it("formats canceled state as Cancelled and tracks canceled pairs", () => {
    const live: ForecastPairStatus = {
      pairName: "pair-a",
      sourceDatastore: "MOCK-DS-A",
      targetDatastore: "MOCK-DS-B",
      state: "canceled",
      completedRuns: 0,
      totalRuns: 2,
    };
    expect(
      getPairStateDisplay(
        undefined,
        live,
        true,
        isPairCancelled(pairs[0], live, new Set()),
      ).stateLabel,
    ).toBe("Cancelled");
    expect(
      getPairStateDisplay(undefined, undefined, true, true).stateLabel,
    ).toBe("Cancelled");
    expect(
      isPairRerunnable(
        pairs[0],
        live,
        new Set(["MOCK-DS-A||MOCK-DS-B"]),
        false,
        false,
        false,
      ),
    ).toBe(true);
    expect(
      isPairRerunnable(
        pairs[0],
        live,
        new Set(["MOCK-DS-A||MOCK-DS-B"]),
        true,
        false,
        false,
      ),
    ).toBe(false);
  });

  it("groups runs by session for the drawer table", () => {
    const rows = groupRunsBySession([
      {
        id: 2,
        sessionId: 2,
        pairName: "pair-a",
        sourceDatastore: "MOCK-DS-A",
        targetDatastore: "MOCK-DS-B",
        iteration: 1,
        diskSizeGb: 10,
        durationSec: 1,
        throughputMbps: 1,
        createdAt: "2026-06-10T09:00:00.000Z",
      },
      {
        id: 1,
        sessionId: 1,
        pairName: "pair-a",
        sourceDatastore: "MOCK-DS-A",
        targetDatastore: "MOCK-DS-B",
        iteration: 1,
        diskSizeGb: 10,
        durationSec: 1,
        throughputMbps: 1,
        createdAt: "2026-06-10T08:00:00.000Z",
      },
    ]);
    expect(rows[0]).toEqual({
      kind: "session",
      sessionIndex: 1,
      sessionId: 1,
    });
    expect(rows[1]).toEqual({
      kind: "run",
      run: expect.objectContaining({ id: 1 }),
    });
  });
});

import { describe, expect, it } from "vitest";
import type {
  ForecastPairStatus,
  ForecastRun,
  SelectedPair,
} from "../forecasterTypes";
import {
  filterPairsByDatastoreName,
  findLivePairStatus,
  getExtraRunningPairs,
  groupRunsBySession,
  indexRunsByPairName,
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

  it("filters pairs by datastore name", () => {
    const filtered = filterPairsByDatastoreName(pairs, "mock-ds-a");
    expect(filtered).toHaveLength(1);
    expect(filterPairsByDatastoreName(pairs, "missing")).toHaveLength(0);
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

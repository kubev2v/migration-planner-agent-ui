import { describe, expect, it } from "vitest";
import type {
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../forecasterTypes";
import {
  formatAllPairsStatsText,
  formatGoDuration,
  formatLastRun,
  formatPairStatsText,
} from "./storageOffloadFormatters";
import { indexRunsByPairName } from "./storageOffloadUtils";

const pair: SelectedPair = {
  id: "pair-a",
  name: "pair-a",
  sourceDatastore: "DS-A",
  targetDatastore: "DS-B",
};

const stats: ForecastStats = {
  pairName: "pair-a",
  sampleCount: 2,
  meanMbps: 950,
  medianMbps: 940,
  minMbps: 850,
  maxMbps: 1100,
  estimatePer1TB: {
    expected: "3h0m0s",
    bestCase: "2h0m0s",
    worstCase: "4h0m0s",
  },
};

const runs: ForecastRun[] = [
  {
    id: 1,
    sessionId: 1,
    pairName: "pair-a",
    sourceDatastore: "DS-A",
    targetDatastore: "DS-B",
    iteration: 1,
    diskSizeGb: 10,
    durationSec: 11,
    throughputMbps: 850,
    method: "xcopy",
    createdAt: "2026-06-10T08:00:00.000Z",
  },
  {
    id: 2,
    sessionId: 1,
    pairName: "pair-a",
    sourceDatastore: "DS-A",
    targetDatastore: "DS-B",
    iteration: 2,
    diskSizeGb: 10,
    durationSec: 10,
    throughputMbps: 950,
    method: "xcopy",
    createdAt: "2026-06-10T09:00:00.000Z",
  },
];

describe("storageOffloadFormatters", () => {
  it("formats Go durations for display", () => {
    expect(formatGoDuration("3h0m9.5s")).toBe("3h 0m 10s");
    expect(formatGoDuration("-")).toBe("-");
  });

  it("formats the latest run timestamp", () => {
    expect(formatLastRun(runs)).toBe(
      new Date("2026-06-10T09:00:00.000Z").toLocaleString(),
    );
    expect(formatLastRun([])).toBe("-");
  });

  it("formats a single pair stats block", () => {
    const text = formatPairStatsText(pair, stats, runs);
    expect(text).toContain("DS-A → DS-B");
    expect(text).toContain("Individual runs (2)");
    expect(text).toContain("Run 1:");
  });

  it("formats all pairs with separators", () => {
    const runsByPair = indexRunsByPairName(runs);
    const text = formatAllPairsStatsText(
      [pair],
      { "pair-a": stats },
      runsByPair,
    );
    expect(text).toContain("DS-A → DS-B");
    expect(text).not.toContain("---");
  });
});

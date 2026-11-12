import { describe, expect, it } from "vitest";

import type { ComplexityOSNameEntryLike } from "../complexityTypes.js";
import {
  limitOsChartData,
  OS_CHART_MAX_BARS,
  sortComplexityOsData,
} from "../osComplexityChartData.js";

const entry = (
  osName: string,
  score: number,
  vmCount: number,
): ComplexityOSNameEntryLike => ({
  osName,
  score,
  vmCount,
});

describe("sortComplexityOsData", () => {
  it("sorts by score ascending and puts unknown last", () => {
    const sorted = sortComplexityOsData([
      entry("Windows", 3, 2),
      entry("Unknown OS", 0, 50),
      entry("RHEL", 1, 10),
      entry("SLES", 1, 4),
    ]);

    expect(sorted.map((item) => item.osName)).toEqual([
      "RHEL",
      "SLES",
      "Windows",
      "Unknown OS",
    ]);
  });
});

describe("limitOsChartData", () => {
  it("keeps the first OS_CHART_MAX_BARS entries", () => {
    const data = Array.from({ length: OS_CHART_MAX_BARS + 5 }, (_, index) =>
      entry(`OS ${index}`, 1, index + 1),
    );

    expect(limitOsChartData(data)).toHaveLength(OS_CHART_MAX_BARS);
    expect(limitOsChartData(data)[0]?.osName).toBe("OS 0");
  });
});

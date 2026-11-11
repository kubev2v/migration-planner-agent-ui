import type { ComplexityOSNameEntryLike } from "./complexityTypes.js";

export const OS_CHART_MAX_BARS = 20;

export const sortComplexityOsData = (
  data: ComplexityOSNameEntryLike[],
): ComplexityOSNameEntryLike[] =>
  [...data].sort((a, b) => {
    if (a.score === 0 && b.score !== 0) return 1;
    if (b.score === 0 && a.score !== 0) return -1;
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return b.vmCount - a.vmCount;
  });

export const limitOsChartData = (
  data: ComplexityOSNameEntryLike[],
): ComplexityOSNameEntryLike[] => data.slice(0, OS_CHART_MAX_BARS);

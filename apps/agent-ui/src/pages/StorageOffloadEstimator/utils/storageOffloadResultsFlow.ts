import type { PageView } from "./forecasterSession";

export function shouldApplyStorageOffloadResults(
  pageView: PageView,
  startOverLoading: boolean,
): boolean {
  return pageView !== "empty" && !startOverLoading;
}

/** True when an in-flight loadResults may still commit to React state. */
export function isStorageOffloadResultsGenerationCurrent(
  capturedGeneration: number,
  currentGeneration: number,
): boolean {
  return capturedGeneration === currentGeneration;
}

export async function waitForPendingResultsWork(
  loadResultsInFlight: Promise<void>,
  benchmarkCompleteInFlight: Promise<void>,
): Promise<void> {
  await Promise.all([
    loadResultsInFlight.catch(() => {}),
    benchmarkCompleteInFlight.catch(() => {}),
  ]);
}

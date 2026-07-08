import type { PageView } from "./forecasterSession";

export function shouldApplyStorageOffloadResults(
  pageView: PageView,
  startOverLoading: boolean,
): boolean {
  return pageView !== "empty" && !startOverLoading;
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

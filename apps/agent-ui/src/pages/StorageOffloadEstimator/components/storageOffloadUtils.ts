import type {
  DatastoreGroup,
  ForecasterDatastore,
  ForecasterStatus,
  ForecastPairStatus,
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../utils/forecasterTypes";

export function groupDatastoresByArray(
  datastores: ForecasterDatastore[],
): DatastoreGroup[] {
  const map = new Map<string, DatastoreGroup>();
  for (const ds of datastores) {
    const key = ds.storageArrayId || `__ungrouped__${ds.name}`;
    if (!map.has(key)) {
      map.set(key, {
        storageArrayId: key,
        storageVendor: ds.storageVendor,
        storageModel: ds.storageModel,
        datastores: [],
      });
    }
    const group = map.get(key);
    if (group) group.datastores.push(ds);
  }
  return Array.from(map.values());
}

export function forecastPairToSelectedPair(
  pair: ForecastPairStatus,
): SelectedPair {
  return {
    id: pair.pairName,
    name: pair.pairName,
    sourceDatastore: pair.sourceDatastore,
    targetDatastore: pair.targetDatastore,
  };
}

export function createEmptyPair(): SelectedPair {
  const id = `pair-${Date.now()}`;
  return { id, name: id, sourceDatastore: "", targetDatastore: "" };
}

export function isCompletePair(pair: SelectedPair): boolean {
  return !!(pair.sourceDatastore && pair.targetDatastore);
}

export function pairSourceTargetKey(pair: SelectedPair): string {
  return `${pair.sourceDatastore}||${pair.targetDatastore}`;
}

export function hasDuplicateArrayRoutes(
  pairs: SelectedPair[],
  datastores: ForecasterDatastore[],
): boolean {
  const dsMap = new Map(datastores.map((d) => [d.name, d]));
  const seen = new Set<string>();
  for (const p of pairs) {
    if (!isCompletePair(p)) continue;
    const srcArrayId =
      dsMap.get(p.sourceDatastore)?.storageArrayId ?? p.sourceDatastore;
    const tgtArrayId =
      dsMap.get(p.targetDatastore)?.storageArrayId ?? p.targetDatastore;
    const key = `${srcArrayId}::${tgtArrayId}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function indexRunsByPairName(
  runs: ForecastRun[],
): (pairName: string) => ForecastRun[] {
  const map = new Map<string, ForecastRun[]>();
  for (const run of runs) {
    const bucket = map.get(run.pairName) ?? [];
    bucket.push(run);
    map.set(run.pairName, bucket);
  }
  return (pairName: string) => map.get(pairName) ?? [];
}

export function findLivePairStatus(
  pair: SelectedPair,
  livePairs: ForecastPairStatus[],
): ForecastPairStatus | undefined {
  return livePairs.find(
    (fp) =>
      fp.pairName === pair.name ||
      (fp.sourceDatastore === pair.sourceDatastore &&
        fp.targetDatastore === pair.targetDatastore),
  );
}

export function getExtraRunningPairs(
  pairs: SelectedPair[],
  forecastStatus: ForecasterStatus | null | undefined,
): SelectedPair[] {
  const livePairs = forecastStatus?.pairs ?? [];
  const knownKeys = new Set(pairs.map(pairSourceTargetKey));
  return livePairs
    .filter(
      (fp) =>
        fp.state !== "completed" &&
        fp.state !== "canceled" &&
        fp.state !== "error" &&
        !knownKeys.has(`${fp.sourceDatastore}||${fp.targetDatastore}`),
    )
    .map(forecastPairToSelectedPair);
}

export function mergeDisplayPairs(
  pairs: SelectedPair[],
  forecastStatus: ForecasterStatus | null | undefined,
): SelectedPair[] {
  return [...pairs, ...getExtraRunningPairs(pairs, forecastStatus)];
}

export function filterPairsByDatastoreName(
  pairs: SelectedPair[],
  query: string,
): SelectedPair[] {
  const q = query.trim().toLowerCase();
  if (!q) return pairs;
  return pairs.filter(
    (p) =>
      p.sourceDatastore.toLowerCase().includes(q) ||
      p.targetDatastore.toLowerCase().includes(q),
  );
}

export type RunsTableRow =
  | { kind: "session"; sessionIndex: number; sessionId: number }
  | { kind: "run"; run: ForecastRun };

export function groupRunsBySession(runs: ForecastRun[]): RunsTableRow[] {
  const sessionMap = new Map<number, ForecastRun[]>();
  for (const run of runs) {
    const bucket = sessionMap.get(run.sessionId) ?? [];
    bucket.push(run);
    sessionMap.set(run.sessionId, bucket);
  }

  const rows: RunsTableRow[] = [];
  const sortedSessions = [...sessionMap.entries()].sort(([a], [b]) => a - b);
  sortedSessions.forEach(([sessionId, sessionRuns], idx) => {
    rows.push({ kind: "session", sessionIndex: idx + 1, sessionId });
    const sorted = [...sessionRuns].sort((a, b) => a.iteration - b.iteration);
    for (const run of sorted) {
      rows.push({ kind: "run", run });
    }
  });
  return rows;
}

export function formatPairStateLabel(
  state: string | undefined,
): string | undefined {
  if (!state) {
    return undefined;
  }
  if (state === "canceled") {
    return "Cancelled";
  }
  return state;
}

export function isPairCancelable(
  liveStatus: ForecastPairStatus | undefined,
  benchmarkDone: boolean,
): boolean {
  if (benchmarkDone || !liveStatus) {
    return false;
  }
  return (
    liveStatus.state === "pending" ||
    liveStatus.state === "preparing" ||
    liveStatus.state === "running"
  );
}

export function isPairCancelled(
  pair: SelectedPair,
  liveStatus: ForecastPairStatus | undefined,
  canceledPairKeys: ReadonlySet<string>,
): boolean {
  if (liveStatus?.state === "canceled") {
    return true;
  }
  return canceledPairKeys.has(pairSourceTargetKey(pair));
}

export function isPairRerunnable(
  pair: SelectedPair,
  liveStatus: ForecastPairStatus | undefined,
  canceledPairKeys: ReadonlySet<string>,
  isBenchmarkRunning: boolean,
  isCancelInFlight: boolean,
  runLoading: boolean,
): boolean {
  return (
    isPairCancelled(pair, liveStatus, canceledPairKeys) &&
    !isBenchmarkRunning &&
    !isCancelInFlight &&
    !runLoading
  );
}

export function getPairStateDisplay(
  stats: ForecastStats | undefined,
  liveStatus: ForecastPairStatus | undefined,
  benchmarkDone: boolean,
  isCancelled = false,
): {
  isRunning: boolean;
  stateLabel: string | undefined;
  stateColor: "green" | "red" | "blue";
} {
  const isRunning =
    !benchmarkDone &&
    !!liveStatus &&
    liveStatus.state !== "completed" &&
    liveStatus.state !== "error" &&
    liveStatus.state !== "canceled";

  if (isCancelled) {
    return {
      isRunning,
      stateLabel: "Cancelled",
      stateColor: "red",
    };
  }

  const stateLabel: string | undefined = isRunning
    ? liveStatus?.state
    : liveStatus
      ? formatPairStateLabel(liveStatus.state)
      : stats && stats.sampleCount > 0
        ? "complete"
        : undefined;
  const stateColor = !liveStatus
    ? "green"
    : liveStatus.state === "completed"
      ? "green"
      : liveStatus.state === "error" || liveStatus.state === "canceled"
        ? "red"
        : "blue";
  return { isRunning, stateLabel, stateColor };
}

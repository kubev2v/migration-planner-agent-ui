import type {
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../utils/forecasterTypes";

export function formatGoDuration(raw: string): string {
  if (!raw || raw === "-") return raw;
  let s = raw.replace(
    /(\d+(?:\.\d+)?)s$/,
    (_, sec) => `${Math.round(parseFloat(sec))}s`,
  );
  s = s.replace(/h(\d)/, "h $1").replace(/m(\d)/, "m $1");
  return s;
}

export function formatLastRun(pairRuns: ForecastRun[]): string {
  if (pairRuns.length === 0) return "-";
  const latest = pairRuns.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
  );
  return new Date(latest.createdAt).toLocaleString();
}

export function formatPairStatsText(
  pair: SelectedPair,
  stats: ForecastStats,
  pairRuns: ForecastRun[],
): string {
  const lines: string[] = [
    `${pair.sourceDatastore} → ${pair.targetDatastore}`,
    "",
    "Storage-offload estimate (for 1 TB transfer)",
    `  Expected:   ${stats.estPer1TB?.expected ?? "-"}`,
    `  Best case:  ${stats.estPer1TB?.bestCase ?? "-"}`,
    `  Worst case: ${stats.estPer1TB?.worstCase ?? "-"}`,
    "",
    "Throughput statistics",
    `  Samples:  ${stats.sampleCount}`,
    `  Mean:     ${stats.meanMBps?.toFixed(1) ?? "-"} MB/s`,
    `  Median:   ${stats.medianMBps?.toFixed(1) ?? "-"} MB/s`,
    `  Min/Max:  ${stats.minMBps?.toFixed(1) ?? "-"} / ${stats.maxMBps?.toFixed(1) ?? "-"} MB/s`,
    `  Std Dev:  ${stats.stdDevMBps?.toFixed(1) ?? "-"} MB/s`,
    `  95% CI:   [${stats.ci95Lower?.toFixed(1) ?? "-"}, ${stats.ci95Upper?.toFixed(1) ?? "-"}] MB/s`,
  ];
  if (pairRuns.length > 0) {
    lines.push("", `Individual runs (${pairRuns.length})`);
    for (const r of pairRuns) {
      lines.push(
        `  Run ${r.iteration}: ${r.durationSec?.toFixed(1) ?? "-"}s  ${r.throughputMBps?.toFixed(1) ?? "-"} MB/s  ${r.method ?? "-"}`,
      );
    }
  }
  return lines.join("\n");
}

export function formatAllPairsStatsText(
  pairs: SelectedPair[],
  statsMap: Record<string, ForecastStats>,
  runsByPairName: (pairName: string) => ForecastRun[],
): string {
  return pairs
    .filter((p) => statsMap[p.name]?.sampleCount > 0)
    .map((p) =>
      formatPairStatsText(p, statsMap[p.name], runsByPairName(p.name)),
    )
    .join("\n\n---\n\n");
}

export function copyTextToClipboard(text: string): void {
  if (!navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => undefined);
}

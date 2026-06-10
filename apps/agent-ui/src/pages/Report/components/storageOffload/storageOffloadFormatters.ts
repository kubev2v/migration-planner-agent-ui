import type {
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../forecasterTypes";

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
    `  Expected:   ${stats.estimatePer1TB?.expected ?? "-"}`,
    `  Best case:  ${stats.estimatePer1TB?.bestCase ?? "-"}`,
    `  Worst case: ${stats.estimatePer1TB?.worstCase ?? "-"}`,
    "",
    "Throughput statistics",
    `  Samples:  ${stats.sampleCount}`,
    `  Mean:     ${stats.meanMbps?.toFixed(1) ?? "-"} MB/s`,
    `  Median:   ${stats.medianMbps?.toFixed(1) ?? "-"} MB/s`,
    `  Min/Max:  ${stats.minMbps?.toFixed(1) ?? "-"} / ${stats.maxMbps?.toFixed(1) ?? "-"} MB/s`,
    `  Std Dev:  ${stats.stddevMbps?.toFixed(1) ?? "-"} MB/s`,
    `  95% CI:   [${stats.ci95LowerMbps?.toFixed(1) ?? "-"}, ${stats.ci95UpperMbps?.toFixed(1) ?? "-"}] MB/s`,
  ];
  if (pairRuns.length > 0) {
    lines.push("", `Individual runs (${pairRuns.length})`);
    for (const r of pairRuns) {
      lines.push(
        `  Run ${r.iteration}: ${r.durationSec.toFixed(1)}s  ${r.throughputMbps.toFixed(1)} MB/s  ${r.method ?? "-"}`,
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

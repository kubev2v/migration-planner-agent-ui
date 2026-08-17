import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Icon,
  Label,
  Spinner,
  Tooltip,
} from "@patternfly/react-core";
import { BanIcon, CopyIcon, RedoIcon } from "@patternfly/react-icons";
import { Td, Tr } from "@patternfly/react-table";
import type React from "react";
import type {
  ForecastPairStatus,
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../utils/forecasterTypes";
import type { ToggleableColumnKey } from "./storageOffloadColumns";
import { formatGoDuration, formatLastRun } from "./storageOffloadFormatters";
import {
  getPairStateDisplay,
  isPairCancelable,
  isPairCancelled,
  isPairRerunnable,
} from "./storageOffloadUtils";

export interface EstimateComparisonRowProps {
  pair: SelectedPair;
  stats: ForecastStats | undefined;
  pairRuns: ForecastRun[];
  liveStatus: ForecastPairStatus | undefined;
  benchmarkDone: boolean;
  isColumnVisible: (key: ToggleableColumnKey) => boolean;
  onOpenRunsDrawer: (pair: SelectedPair) => void;
  onCopy: () => void;
  onCancelPair?: (pair: SelectedPair, pairKey: string) => void;
  onRerunPair?: (pair: SelectedPair) => void;
  isCanceling?: boolean;
  isCancelInFlight?: boolean;
  canceledPairNames?: ReadonlySet<string>;
  isBenchmarkRunning?: boolean;
  runLoading?: boolean;
}

const EMPTY_CANCELED_PAIR_NAMES = new Set<string>();

export const EstimateComparisonRow: React.FC<EstimateComparisonRowProps> = ({
  pair,
  stats,
  pairRuns,
  liveStatus,
  benchmarkDone,
  isColumnVisible,
  onOpenRunsDrawer,
  onCopy,
  onCancelPair,
  onRerunPair,
  isCanceling = false,
  isCancelInFlight = false,
  canceledPairNames = EMPTY_CANCELED_PAIR_NAMES,
  isBenchmarkRunning = false,
  runLoading = false,
}) => {
  const pairKey = liveStatus?.pairName ?? pair.name;
  const isCancelled = isPairCancelled(pair, liveStatus, canceledPairNames);
  const { isRunning, stateLabel, stateColor } = getPairStateDisplay(
    stats,
    liveStatus,
    benchmarkDone,
    isCancelled,
  );
  const canCancel = isPairCancelable(liveStatus, benchmarkDone);
  const canRerun = isPairRerunnable(
    pair,
    liveStatus,
    canceledPairNames,
    isBenchmarkRunning,
    isCancelInFlight,
    runLoading,
  );

  return (
    <>
      <Tr>
        <Td>{pair.sourceDatastore}</Td>
        <Td>{pair.targetDatastore}</Td>
        {isColumnVisible("expected") && (
          <Td>
            {stats?.estPer1TB?.expected
              ? formatGoDuration(stats.estPer1TB.expected)
              : "-"}
          </Td>
        )}
        {isColumnVisible("best") && (
          <Td>
            {stats?.estPer1TB?.bestCase
              ? formatGoDuration(stats.estPer1TB.bestCase)
              : "-"}
          </Td>
        )}
        {isColumnVisible("worst") && (
          <Td>
            {stats?.estPer1TB?.worstCase
              ? formatGoDuration(stats.estPer1TB.worstCase)
              : "-"}
          </Td>
        )}
        {isColumnVisible("samples") && <Td>{stats?.sampleCount ?? "-"}</Td>}
        {isColumnVisible("mean") && (
          <Td>{stats?.meanMBps != null ? stats.meanMBps.toFixed(1) : "-"}</Td>
        )}
        {isColumnVisible("median") && (
          <Td>
            {stats?.medianMBps != null ? stats.medianMBps.toFixed(1) : "-"}
          </Td>
        )}
        {isColumnVisible("minMax") && (
          <Td>
            {stats?.minMBps != null && stats?.maxMBps != null
              ? `${stats.minMBps.toFixed(1)} / ${stats.maxMBps.toFixed(1)}`
              : "-"}
          </Td>
        )}
        {isColumnVisible("stddev") && (
          <Td>
            {stats?.stdDevMBps != null ? stats.stdDevMBps.toFixed(1) : "-"}
          </Td>
        )}
        {isColumnVisible("ci95") && (
          <Td>
            {stats?.ci95Lower != null && stats?.ci95Upper != null
              ? `[${stats.ci95Lower.toFixed(1)}, ${stats.ci95Upper.toFixed(1)}]`
              : "-"}
          </Td>
        )}
        <Td>
          {pairRuns.length > 0 ? (
            <Button
              variant="link"
              isInline
              onClick={() => onOpenRunsDrawer(pair)}
            >
              {pairRuns.length} {pairRuns.length === 1 ? "run" : "runs"}
            </Button>
          ) : isRunning ? (
            <Spinner size="sm" aria-label="Running" />
          ) : (
            "-"
          )}
        </Td>
        <Td>{formatLastRun(pairRuns)}</Td>
        <Td hasAction>
          {stateLabel ? <Label color={stateColor}>{stateLabel}</Label> : "-"}
        </Td>
        <Td hasAction>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapSm" }}
          >
            {stats && stats.sampleCount > 0 && (
              <FlexItem>
                <Button
                  variant="plain"
                  aria-label="Copy as plain text"
                  onClick={onCopy}
                >
                  <CopyIcon />
                </Button>
              </FlexItem>
            )}
            {canCancel && onCancelPair && (
              <FlexItem>
                <Tooltip content="Cancel benchmark">
                  <Button
                    variant="plain"
                    aria-label={`Cancel benchmark for ${pair.sourceDatastore} to ${pair.targetDatastore}`}
                    onClick={() => onCancelPair(pair, pairKey)}
                    isDisabled={isCancelInFlight || isCanceling}
                  >
                    {isCanceling ? (
                      <Spinner size="sm" aria-label="Canceling" />
                    ) : (
                      <Icon status="danger">
                        <BanIcon />
                      </Icon>
                    )}
                  </Button>
                </Tooltip>
              </FlexItem>
            )}
            {canRerun && onRerunPair && (
              <FlexItem>
                <Tooltip content="Run benchmark again">
                  <Button
                    variant="plain"
                    aria-label={`Run benchmark again for ${pair.sourceDatastore} to ${pair.targetDatastore}`}
                    onClick={() => onRerunPair(pair)}
                  >
                    <RedoIcon />
                  </Button>
                </Tooltip>
              </FlexItem>
            )}
          </Flex>
        </Td>
      </Tr>
      {liveStatus?.state === "error" && liveStatus.error && (
        <Tr>
          <Td colSpan={15}>
            <Alert variant="danger" title={liveStatus.error} isInline />
          </Td>
        </Tr>
      )}
    </>
  );
};

EstimateComparisonRow.displayName = "EstimateComparisonRow";

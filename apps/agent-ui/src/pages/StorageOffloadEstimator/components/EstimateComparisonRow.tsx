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
            {stats?.estimatePer1TB?.expected
              ? formatGoDuration(stats.estimatePer1TB.expected)
              : "-"}
          </Td>
        )}
        {isColumnVisible("best") && (
          <Td>
            {stats?.estimatePer1TB?.bestCase
              ? formatGoDuration(stats.estimatePer1TB.bestCase)
              : "-"}
          </Td>
        )}
        {isColumnVisible("worst") && (
          <Td>
            {stats?.estimatePer1TB?.worstCase
              ? formatGoDuration(stats.estimatePer1TB.worstCase)
              : "-"}
          </Td>
        )}
        {isColumnVisible("samples") && <Td>{stats?.sampleCount ?? "-"}</Td>}
        {isColumnVisible("mean") && (
          <Td>{stats?.meanMbps != null ? stats.meanMbps.toFixed(1) : "-"}</Td>
        )}
        {isColumnVisible("median") && (
          <Td>
            {stats?.medianMbps != null ? stats.medianMbps.toFixed(1) : "-"}
          </Td>
        )}
        {isColumnVisible("minMax") && (
          <Td>
            {stats?.minMbps != null && stats?.maxMbps != null
              ? `${stats.minMbps.toFixed(1)} / ${stats.maxMbps.toFixed(1)}`
              : "-"}
          </Td>
        )}
        {isColumnVisible("stddev") && (
          <Td>
            {stats?.stddevMbps != null ? stats.stddevMbps.toFixed(1) : "-"}
          </Td>
        )}
        {isColumnVisible("ci95") && (
          <Td>
            {stats?.ci95LowerMbps != null && stats?.ci95UpperMbps != null
              ? `[${stats.ci95LowerMbps.toFixed(1)}, ${stats.ci95UpperMbps.toFixed(1)}]`
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
        <Td>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            gap={{ default: "gapSm" }}
          >
            <FlexItem>
              {stateLabel ? (
                <Label color={stateColor}>{stateLabel}</Label>
              ) : (
                "-"
              )}
            </FlexItem>
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
                  <span style={{ display: "inline-flex" }}>
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
                  </span>
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
          <Td colSpan={14}>
            <Alert variant="danger" title={liveStatus.error} isInline />
          </Td>
        </Tr>
      )}
    </>
  );
};

EstimateComparisonRow.displayName = "EstimateComparisonRow";

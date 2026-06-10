import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from "@patternfly/react-core";
import { CopyIcon } from "@patternfly/react-icons";
import { Td, Tr } from "@patternfly/react-table";
import type React from "react";
import type {
  ForecastPairStatus,
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../forecasterTypes";
import type { ToggleableColumnKey } from "./storageOffloadColumns";
import { formatGoDuration, formatLastRun } from "./storageOffloadFormatters";
import { getPairStateDisplay } from "./storageOffloadUtils";

export interface EstimateComparisonRowProps {
  pair: SelectedPair;
  stats: ForecastStats | undefined;
  pairRuns: ForecastRun[];
  liveStatus: ForecastPairStatus | undefined;
  benchmarkDone: boolean;
  isColumnVisible: (key: ToggleableColumnKey) => boolean;
  onOpenRunsDrawer: (pair: SelectedPair) => void;
  onCopy: () => void;
}

export const EstimateComparisonRow: React.FC<EstimateComparisonRowProps> = ({
  pair,
  stats,
  pairRuns,
  liveStatus,
  benchmarkDone,
  isColumnVisible,
  onOpenRunsDrawer,
  onCopy,
}) => {
  const { isRunning, stateLabel, stateColor } = getPairStateDisplay(
    stats,
    liveStatus,
    benchmarkDone,
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

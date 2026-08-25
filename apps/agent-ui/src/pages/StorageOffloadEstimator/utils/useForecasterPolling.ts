import { useCallback, useEffect, useRef, useState } from "react";
import {
  useGetForecasterStatusQuery,
  useLazyGetForecasterStatusQuery,
} from "../../../store/api/forecasterEndpoints";
import type { ForecasterStatus } from "./forecasterTypes";

const POLL_INTERVAL_MS = 2000;

export interface UseForecasterPollingOptions {
  onStatusUpdate: (status: ForecasterStatus) => void;
  onBenchmarkComplete: (pairNames: string[]) => void | Promise<void>;
}

/**
 * Drives the forecaster status polling on top of RTK Query. The actual fetching
 * and interval are owned by `useGetForecasterStatusQuery` (via `pollingInterval`
 * / `skip`); this hook keeps the small state machine that decides *when* to poll
 * and detects the running → ready edge that means a benchmark finished.
 *
 * The public surface is unchanged from the previous hand-rolled `setInterval`
 * implementation so `StorageOffloadTab` keeps working without changes.
 */
export function useForecasterPolling({
  onStatusUpdate,
  onBenchmarkComplete,
}: UseForecasterPollingOptions) {
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Mirror the reactive flags into refs so the imperative callbacks read the
  // current value without being re-created on every toggle.
  const pollingEnabledRef = useRef(false);
  pollingEnabledRef.current = pollingEnabled;
  const isStartingRef = useRef(false);
  isStartingRef.current = isStarting;

  const wasRunningRef = useRef(false);
  const pairNamesRef = useRef<string[]>([]);
  // Bumped on every stop/start; a completion callback captured under an old
  // epoch is ignored (e.g. Start Over interrupting a finishing benchmark).
  const pollEpochRef = useRef(0);

  // Keep the latest callbacks reachable from the stable status processor.
  const onStatusUpdateRef = useRef(onStatusUpdate);
  onStatusUpdateRef.current = onStatusUpdate;
  const onBenchmarkCompleteRef = useRef(onBenchmarkComplete);
  onBenchmarkCompleteRef.current = onBenchmarkComplete;

  // RTK Query owns the interval: a running benchmark polls every
  // POLL_INTERVAL_MS; disabling drops the interval to 0 and skips the query.
  // `refetchOnMountOrArgChange` forces a fresh fetch the moment polling is
  // (re)enabled instead of waiting a full interval.
  const { data: statusData, fulfilledTimeStamp } = useGetForecasterStatusQuery(
    undefined,
    {
      skip: !pollingEnabled,
      pollingInterval: pollingEnabled ? POLL_INTERVAL_MS : 0,
      refetchOnMountOrArgChange: true,
    },
  );
  const [triggerStatus] = useLazyGetForecasterStatusQuery();

  // Latest fulfilled timestamp, and the one we already reacted to, so a stale
  // cached result left over from a previous run is never processed again.
  const fulfilledTsRef = useRef<number | undefined>(undefined);
  fulfilledTsRef.current = fulfilledTimeStamp;
  const lastProcessedTsRef = useRef<number | undefined>(undefined);

  const stopPolling = useCallback((options?: { bumpEpoch?: boolean }) => {
    if (options?.bumpEpoch !== false) {
      pollEpochRef.current += 1;
    }
    setPollingEnabled(false);
    setIsStarting(false);
  }, []);

  // Apply a single status observation: surface it, track the running edge, and
  // fire completion exactly once when a benchmark transitions to ready.
  const processStatus = useCallback(
    (status: ForecasterStatus, epoch: number) => {
      if (epoch !== pollEpochRef.current) {
        return;
      }
      onStatusUpdateRef.current(status);
      if (status.state === "running") {
        wasRunningRef.current = true;
      }
      if (wasRunningRef.current && status.state === "ready") {
        setPollingEnabled(false);
        if (epoch === pollEpochRef.current) {
          void onBenchmarkCompleteRef.current(pairNamesRef.current);
        }
        pollEpochRef.current += 1;
      }
    },
    [],
  );

  // React to each fresh poll result while polling is active.
  useEffect(() => {
    if (!pollingEnabled || !statusData || fulfilledTimeStamp === undefined) {
      return;
    }
    if (fulfilledTimeStamp === lastProcessedTsRef.current) {
      return;
    }
    lastProcessedTsRef.current = fulfilledTimeStamp;
    processStatus(statusData, pollEpochRef.current);
  }, [pollingEnabled, statusData, fulfilledTimeStamp, processStatus]);

  const startPolling = useCallback((pairNames: string[]) => {
    pollEpochRef.current += 1;
    pairNamesRef.current = pairNames;
    wasRunningRef.current = false;
    // Ignore whatever is currently cached; only a fresh fetch should be acted on.
    lastProcessedTsRef.current = fulfilledTsRef.current;
    setIsStarting(false);
    setPollingEnabled(true);
  }, []);

  const markBenchmarkStarting = useCallback((pairNames: string[]) => {
    pollEpochRef.current += 1;
    pairNamesRef.current = pairNames;
    wasRunningRef.current = false;
    setPollingEnabled(false);
    setIsStarting(true);
  }, []);

  const finishBenchmarkStart = useCallback(() => {
    wasRunningRef.current = true;
    lastProcessedTsRef.current = fulfilledTsRef.current;
    setIsStarting(false);
    setPollingEnabled(true);
  }, []);

  const resumePollingIfNeeded = useCallback(
    async (pairNames: string[]): Promise<ForecasterStatus | null> => {
      if (pollingEnabledRef.current || isStartingRef.current) {
        return null;
      }
      const epoch = pollEpochRef.current;
      pairNamesRef.current = pairNames;
      try {
        const status = await triggerStatus().unwrap();
        if (epoch !== pollEpochRef.current) {
          return null;
        }
        onStatusUpdateRef.current(status);
        if (status.state !== "running") {
          return status;
        }
        wasRunningRef.current = true;
        startPolling(pairNames);
        return status;
      } catch {
        return null;
      }
    },
    [startPolling, triggerStatus],
  );

  const armWasRunning = useCallback(() => {
    wasRunningRef.current = true;
  }, []);

  const refreshStatus = useCallback(async (): Promise<ForecasterStatus> => {
    const epoch = pollEpochRef.current;
    const status = await triggerStatus().unwrap();
    processStatus(status, epoch);
    return status;
  }, [processStatus, triggerStatus]);

  const isPollingActive = pollingEnabled || isStarting;

  return {
    stopPolling,
    isPollingActive,
    startPolling,
    markBenchmarkStarting,
    finishBenchmarkStart,
    resumePollingIfNeeded,
    armWasRunning,
    refreshStatus,
  };
}

import { useCallback, useEffect, useRef } from "react";
import { getForecasterStatus } from "./forecasterApi";
import type { ForecasterStatus } from "./forecasterTypes";

const POLL_INTERVAL_MS = 2000;

export interface UseForecasterPollingOptions {
  basePath: string;
  onStatusUpdate: (status: ForecasterStatus) => void;
  onBenchmarkComplete: (pairNames: string[]) => void | Promise<void>;
}

export function useForecasterPolling({
  basePath,
  onStatusUpdate,
  onBenchmarkComplete,
}: UseForecasterPollingOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef(false);
  const wasRunningRef = useRef(false);
  const pairNamesRef = useRef<string[]>([]);
  const pollEpochRef = useRef(0);

  const stopPolling = useCallback((options?: { bumpEpoch?: boolean }) => {
    if (options?.bumpEpoch !== false) {
      pollEpochRef.current += 1;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isStartingRef.current = false;
  }, []);

  const isPollingActive = useCallback(
    () => intervalRef.current !== null || isStartingRef.current,
    [],
  );

  const pollOnce = useCallback(async () => {
    const epoch = pollEpochRef.current;
    const status = await getForecasterStatus(basePath);
    if (epoch !== pollEpochRef.current) {
      return status;
    }
    onStatusUpdate(status);
    if (status.state === "running") {
      wasRunningRef.current = true;
    }
    if (wasRunningRef.current && status.state === "ready") {
      stopPolling({ bumpEpoch: false });
      if (epoch === pollEpochRef.current) {
        await onBenchmarkComplete(pairNamesRef.current);
      }
      pollEpochRef.current += 1;
    }
    return status;
  }, [basePath, onBenchmarkComplete, onStatusUpdate, stopPolling]);

  const startPolling = useCallback(
    (pairNames: string[]) => {
      stopPolling();
      pairNamesRef.current = pairNames;
      wasRunningRef.current = false;
      void pollOnce();
      intervalRef.current = setInterval(() => {
        void pollOnce();
      }, POLL_INTERVAL_MS);
    },
    [pollOnce, stopPolling],
  );

  const markBenchmarkStarting = useCallback(
    (pairNames: string[]) => {
      stopPolling();
      pairNamesRef.current = pairNames;
      wasRunningRef.current = false;
      isStartingRef.current = true;
    },
    [stopPolling],
  );

  const finishBenchmarkStart = useCallback(() => {
    isStartingRef.current = false;
    wasRunningRef.current = true;
    void pollOnce();
    intervalRef.current = setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
  }, [pollOnce]);

  const resumePollingIfNeeded = useCallback(
    async (pairNames: string[]) => {
      if (isPollingActive()) return null;
      const epoch = pollEpochRef.current;
      pairNamesRef.current = pairNames;
      try {
        const status = await getForecasterStatus(basePath);
        if (epoch !== pollEpochRef.current) {
          return null;
        }
        onStatusUpdate(status);
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
    [basePath, isPollingActive, onStatusUpdate, startPolling],
  );

  const armWasRunning = useCallback(() => {
    wasRunningRef.current = true;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const refreshStatus = useCallback(() => pollOnce(), [pollOnce]);

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

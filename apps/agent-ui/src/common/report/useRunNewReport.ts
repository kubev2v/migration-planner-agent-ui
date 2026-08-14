import type {
  Collection,
  CollectorStatus,
} from "@openshift-migration-advisor/agent-sdk";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { newAbortSignal } from "../AbortSignal";
import type { DefaultApiInterface } from "../agentApi";
import { getLatestCollection, waitForNewerCollection } from "../collectionApi";
import { getCollectorStatus } from "../collectorApi";
import { isCollectorInProgress } from "../collectorStatus";
import { parseApiError } from "../parseApiError";

type UseRunNewReportOptions = {
  onCompleted: () => Promise<void>;
  /** Override for tests; production default is 90s. */
  collectionWaitTimeoutMs?: number;
  /** Override for tests; production default is 1s. */
  collectionWaitIntervalMs?: number;
};

const COLLECTION_WAIT_TIMEOUT_MS = 90_000;
const COLLECTION_WAIT_INTERVAL_MS = 1_000;

function unexpectedCollectorStatusMessage(
  status: CollectorStatus["status"],
): string {
  if (status === "ready") {
    return "The new report was cancelled or interrupted.";
  }
  return `The new report stopped unexpectedly (${status}). Please try again.`;
}

async function settleNewReport(
  agentApi: DefaultApiInterface,
  previousCollection: Pick<Collection, "id" | "createdAt"> | null,
  onCompleted: () => Promise<void>,
  isCancelled: () => boolean,
  collectionWaitTimeoutMs: number,
  collectionWaitIntervalMs: number,
): Promise<void> {
  const { foundNewer } = await waitForNewerCollection(
    agentApi,
    previousCollection,
    {
      timeoutMs: collectionWaitTimeoutMs,
      intervalMs: collectionWaitIntervalMs,
    },
  );

  if (isCancelled()) {
    return;
  }

  if (!foundNewer) {
    throw new Error(
      "The new report finished, but the updated collection is not available yet. Please try refreshing the page in a moment.",
    );
  }

  if (isCancelled()) {
    return;
  }

  await onCompleted();
}

export function useRunNewReport(
  agentApi: DefaultApiInterface,
  {
    onCompleted,
    collectionWaitTimeoutMs = COLLECTION_WAIT_TIMEOUT_MS,
    collectionWaitIntervalMs = COLLECTION_WAIT_INTERVAL_MS,
  }: UseRunNewReportOptions,
) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectorStatus, setCollectorStatus] = useState<
    CollectorStatus["status"] | null
  >(null);
  const [showReadyAlert, setShowReadyAlert] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const isCollectingRef = useRef(false);
  const isFinishingRef = useRef(false);
  const pollFailuresRef = useRef(0);
  const previousCollectionRef = useRef<Pick<
    Collection,
    "id" | "createdAt"
  > | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isCancelled = useCallback(() => !mountedRef.current, []);

  useEffect(() => {
    let cancelled = false;

    const checkInitialStatus = async () => {
      try {
        const status = await getCollectorStatus(agentApi);
        if (!cancelled && isCollectorInProgress(status.status)) {
          pollFailuresRef.current = 0;
          const latest = await getLatestCollection(agentApi);
          previousCollectionRef.current = latest
            ? { id: latest.id, createdAt: latest.createdAt }
            : null;
          isCollectingRef.current = true;
          setCollectorStatus(status.status);
          setIsCollecting(true);
          setShowReadyAlert(false);
        }
      } catch (err) {
        console.error("Error checking collector status:", err);
      }
    };

    void checkInitialStatus();
    return () => {
      cancelled = true;
    };
  }, [agentApi]);

  const resetCollectingState = useCallback(() => {
    isCollectingRef.current = false;
    setIsCollecting(false);
    setCollectorStatus(null);
  }, []);

  const finishSuccessfully = useCallback(
    async (options?: { throwOnError?: boolean }): Promise<boolean> => {
      if (isFinishingRef.current) {
        return false;
      }
      isFinishingRef.current = true;
      setCollectorStatus("collected");

      try {
        await settleNewReport(
          agentApi,
          previousCollectionRef.current,
          onCompletedRef.current,
          isCancelled,
          collectionWaitTimeoutMs,
          collectionWaitIntervalMs,
        );
        if (mountedRef.current) {
          setCollectError(null);
          setShowReadyAlert(true);
        }
        return mountedRef.current;
      } catch (err) {
        console.error("Error refreshing report after collection:", err);
        const message = await parseApiError(
          err,
          "The new report finished, but refreshing the page failed.",
        );
        if (mountedRef.current) {
          setCollectError(message);
        }
        if (options?.throwOnError) {
          throw new Error(message);
        }
        return false;
      } finally {
        if (mountedRef.current) {
          resetCollectingState();
        }
        isFinishingRef.current = false;
      }
    },
    [
      agentApi,
      collectionWaitIntervalMs,
      collectionWaitTimeoutMs,
      isCancelled,
      resetCollectingState,
    ],
  );

  useEffect(() => {
    if (!isCollecting) {
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      if (isFinishingRef.current) {
        return;
      }

      try {
        const nextStatus = await getCollectorStatus(agentApi);
        pollFailuresRef.current = 0;

        if (cancelled || isFinishingRef.current) {
          return;
        }

        setCollectorStatus(nextStatus.status);

        if (isCollectorInProgress(nextStatus.status)) {
          return;
        }

        if (nextStatus.status === "collected") {
          await finishSuccessfully();
          return;
        }

        resetCollectingState();

        if (nextStatus.status === "error") {
          setCollectError(
            nextStatus.error || "The new report failed. Please try again.",
          );
        } else {
          setCollectError(unexpectedCollectorStatusMessage(nextStatus.status));
        }
      } catch (err) {
        pollFailuresRef.current += 1;
        console.error("Error polling collector status:", err);
        if (pollFailuresRef.current >= 5 && !cancelled) {
          resetCollectingState();
          setCollectError(
            await parseApiError(
              err,
              "Lost contact with the collector while running a new report.",
            ),
          );
          pollFailuresRef.current = 0;
        }
      }
    };

    const interval = setInterval(() => {
      void pollStatus();
    }, 2000);
    void pollStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agentApi, finishSuccessfully, isCollecting, resetCollectingState]);

  const openModal = useCallback(() => {
    if (isCollectingRef.current) {
      return;
    }
    setCollectError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const confirmRun = useCallback(async () => {
    setCollectError(null);
    setShowReadyAlert(false);
    pollFailuresRef.current = 0;

    try {
      const current = await getLatestCollection(agentApi);
      previousCollectionRef.current = current
        ? { id: current.id, createdAt: current.createdAt }
        : null;

      const signal = newAbortSignal(
        "The server didn't respond in a timely fashion.",
      );
      const started = await agentApi.startCollector({ signal });
      setCollectorStatus(started.status);
      setIsModalOpen(false);

      if (started.status === "collected") {
        await finishSuccessfully({ throwOnError: true });
        return;
      }

      if (started.status === "error") {
        throw new Error(
          started.error || "The new report failed. Please try again.",
        );
      }

      if (!isCollectorInProgress(started.status)) {
        throw new Error(unexpectedCollectorStatusMessage(started.status));
      }

      isCollectingRef.current = true;
      setIsCollecting(true);
    } catch (err) {
      resetCollectingState();
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(
        await parseApiError(
          err,
          "Failed to start a new report. Please try again.",
        ),
      );
    }
  }, [agentApi, finishSuccessfully, resetCollectingState]);

  const dismissReadyAlert = useCallback(() => {
    setShowReadyAlert(false);
  }, []);

  const dismissCollectError = useCallback(() => {
    setCollectError(null);
  }, []);

  return {
    isModalOpen,
    isCollecting,
    collectorStatus,
    showReadyAlert,
    collectError,
    openModal,
    closeModal,
    confirmRun,
    dismissReadyAlert,
    dismissCollectError,
  };
}

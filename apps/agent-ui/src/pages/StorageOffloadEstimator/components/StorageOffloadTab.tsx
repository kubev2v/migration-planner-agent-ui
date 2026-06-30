import {
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TechnologyPreviewBadge } from "../../../common/components/TechnologyPreviewBadge";
import {
  ForecastConflictError,
  getForecasterStatus,
  getRuns,
  getStats,
  postDatastores,
  startForecast,
} from "../utils/forecasterApi";
import {
  clearWizardState,
  loadWizardState,
  type PageView,
} from "../utils/forecasterSession";
import type {
  ForecasterDatastore,
  ForecasterStatus,
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "../utils/forecasterTypes";
import { useForecasterPolling } from "../utils/useForecasterPolling";
import { usePairCapabilities } from "../utils/usePairCapabilities";
import { RunEstimateModal, type SetupDraft } from "./RunEstimateModal";
import { StorageOffloadEmptyState } from "./StorageOffloadEmptyState";
import { StorageOffloadResultsView } from "./StorageOffloadResultsView";
import {
  createEmptyPair,
  forecastPairToSelectedPair,
  groupDatastoresByArray,
  isCompletePair,
} from "./storageOffloadUtils";

export interface StorageOffloadTabProps {
  basePath: string;
}

export const StorageOffloadTab: React.FC<StorageOffloadTabProps> = ({
  basePath,
}) => {
  const saved = loadWizardState();

  const [pageView, setPageView] = useState<PageView>(saved.pageView ?? "empty");
  const [credentialsSubmitted, setCredentialsSubmitted] = useState(
    saved.credentialsSubmitted ?? !!saved.datastores?.length,
  );
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [mergeDraftOnRun, setMergeDraftOnRun] = useState(false);
  const [setupDraft, setSetupDraft] = useState<SetupDraft | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  const [datastores, setDatastores] = useState<ForecasterDatastore[]>(
    saved.datastores ?? [],
  );
  const [dsGroups, setDsGroups] = useState(() =>
    saved.datastores ? groupDatastoresByArray(saved.datastores) : [],
  );
  const [dsLoading, setDsLoading] = useState(false);
  const [dsError, setDsError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<SelectedPair[]>(
    saved.pairs ?? [createEmptyPair()],
  );

  const [forecastStatus, setForecastStatus] = useState<ForecasterStatus | null>(
    null,
  );
  const [benchmarkDone, setBenchmarkDone] = useState(false);
  const hasAutoLoadedResultsRef = useRef(false);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, ForecastStats>>({});
  const [allRuns, setAllRuns] = useState<ForecastRun[]>([]);

  const completePairs = useMemo(() => pairs.filter(isCompletePair), [pairs]);
  const draftPairs = useMemo(
    () => setupDraft?.pairs ?? [],
    [setupDraft?.pairs],
  );
  const capabilityPairs = isSetupModalOpen ? draftPairs : completePairs;
  const { pairCapsMap, capsLoading, hasNoCaps } = usePairCapabilities(
    basePath,
    capabilityPairs,
  );

  const loadResults = useCallback(
    async (pairNames: string[]) => {
      if (pairNames.length === 0) {
        setPageView("results");
        return;
      }
      setResultsLoading(true);
      try {
        const [runsResult, ...statsResults] = await Promise.allSettled([
          getRuns(basePath),
          ...pairNames.map((n) => getStats(basePath, n)),
        ]);

        if (runsResult.status === "fulfilled") {
          setAllRuns(runsResult.value);
        }

        const map: Record<string, ForecastStats> = {};
        statsResults.forEach((r, i) => {
          if (r.status === "fulfilled") {
            map[pairNames[i]] = r.value;
          }
        });
        setStatsMap(map);
      } finally {
        setResultsLoading(false);
        setPageView("results");
      }
    },
    [basePath],
  );

  const onBenchmarkComplete = useCallback(
    async (pairNames: string[]) => {
      setBenchmarkDone(true);
      await loadResults(pairNames);
    },
    [loadResults],
  );

  const {
    stopPolling,
    isPollingActive,
    markBenchmarkStarting,
    finishBenchmarkStart,
    resumePollingIfNeeded,
    armWasRunning,
  } = useForecasterPolling({
    basePath,
    onStatusUpdate: setForecastStatus,
    onBenchmarkComplete,
  });

  const hadSavedSession = useRef(!!saved.pageView);
  useEffect(() => {
    if (hadSavedSession.current) return;

    let cancelled = false;
    const probe = async () => {
      try {
        const status = await getForecasterStatus(basePath);
        if (cancelled) return;

        if (status.state === "running") {
          const backendPairs = (status.pairs ?? []).map(
            forecastPairToSelectedPair,
          );
          if (backendPairs.length > 0) setPairs(backendPairs);
          setForecastStatus(status);
          setBenchmarkDone(false);
          armWasRunning();
          setPageView("results");
          setCredentialsSubmitted(true);
          return;
        }

        const runs = await getRuns(basePath);
        if (cancelled || runs.length === 0) return;

        const runsByPair = new Map<string, ForecastRun>();
        for (const r of runs) {
          if (!runsByPair.has(r.pairName)) runsByPair.set(r.pairName, r);
        }
        setPairs(
          Array.from(runsByPair.entries()).map(([name, run]) => ({
            id: name,
            name,
            sourceDatastore: run.sourceDatastore,
            targetDatastore: run.targetDatastore,
          })),
        );
        setAllRuns(runs);
        setBenchmarkDone(true);
        setPageView("results");
        setCredentialsSubmitted(true);
        hasAutoLoadedResultsRef.current = false;
      } catch {
        // forecaster may not be reachable
      }
    };

    void probe();
    return () => {
      cancelled = true;
    };
  }, [armWasRunning, basePath]);

  useEffect(() => {
    if (
      pageView !== "results" ||
      resultsLoading ||
      hasAutoLoadedResultsRef.current ||
      isPollingActive()
    ) {
      return;
    }
    hasAutoLoadedResultsRef.current = true;
    void loadResults(completePairs.map((p) => p.name));
  }, [pageView, resultsLoading, completePairs, loadResults, isPollingActive]);

  useEffect(() => {
    if (pageView !== "results") return;
    void resumePollingIfNeeded(completePairs.map((p) => p.name));
  }, [pageView, completePairs, resumePollingIfNeeded]);

  const reset = useCallback(() => {
    stopPolling();
    hasAutoLoadedResultsRef.current = false;
    clearWizardState();
    setPageView("empty");
    setCredentialsSubmitted(false);
    setIsSetupModalOpen(false);
    setSetupDraft(null);
    setDatastores([]);
    setDsGroups([]);
    setPairs([createEmptyPair()]);
    setForecastStatus(null);
    setBenchmarkDone(false);
    setStatsMap({});
    setAllRuns([]);
  }, [stopPolling]);

  const redirectToRunningBenchmark = useCallback(async (): Promise<boolean> => {
    try {
      const status = await getForecasterStatus(basePath);
      setForecastStatus(status);
      if (status.state === "running") {
        const backendPairs = (status.pairs ?? []).map(
          forecastPairToSelectedPair,
        );
        if (backendPairs.length > 0) setPairs(backendPairs);
        setBenchmarkDone(false);
        armWasRunning();
        setPageView("results");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [armWasRunning, basePath]);

  const openSetupModal = useCallback(
    async (mode: "initial" | "add-pairs") => {
      setMergeDraftOnRun(mode === "add-pairs");
      setSetupDraft({
        pairs:
          mode === "add-pairs"
            ? [createEmptyPair()]
            : pairs.length > 0
              ? pairs
              : [createEmptyPair()],
        vmAcknowledged: false,
      });
      setIsSetupModalOpen(true);

      // Try to load datastores using credentials from the agent context
      if (datastores.length === 0) {
        // Use credentials from context - the backend should have access to them
        setDsLoading(true);
        try {
          // Try to load datastores without passing credentials (backend should use stored ones)
          const dsList = await postDatastores(basePath);
          setDatastores(dsList);
          setDsGroups(groupDatastoresByArray(dsList));
          setCredentialsSubmitted(true);
          setDsError(null);
        } catch (e) {
          setDsError(
            e instanceof Error
              ? e.message
              : "Failed to load datastores. Please verify your vCenter credentials are correctly configured.",
          );
        } finally {
          setDsLoading(false);
        }
      }
    },
    [pairs, datastores.length, basePath],
  );

  const closeSetupModal = useCallback(() => {
    setIsSetupModalOpen(false);
    setSetupDraft(null);
  }, []);

  const runBenchmark = useCallback(
    async (pairsToRun: SelectedPair[], mergeIntoExisting: boolean) => {
      const validPairs = pairsToRun.filter(isCompletePair);
      if (validPairs.length === 0) {
        setDsError("Select at least one complete pair.");
        return;
      }
      setDsError(null);
      setRunLoading(true);

      const allPairNames = mergeIntoExisting
        ? [
            ...completePairs.map((p) => p.name),
            ...validPairs.map((p) => p.name),
          ].filter((v, i, a) => a.indexOf(v) === i)
        : validPairs.map((p) => p.name);

      try {
        const currentStatus = await getForecasterStatus(basePath);
        if (currentStatus.state === "running") {
          setForecastStatus(currentStatus);
          const backendPairs = (currentStatus.pairs ?? []).map(
            forecastPairToSelectedPair,
          );
          if (backendPairs.length > 0) setPairs(backendPairs);
          setBenchmarkDone(false);
          armWasRunning();
          setPageView("results");
          closeSetupModal();
          return;
        }
      } catch {
        // proceed with start attempt
      }

      setForecastStatus(null);
      setBenchmarkDone(false);
      markBenchmarkStarting(allPairNames);
      setPageView("results");
      closeSetupModal();

      if (mergeIntoExisting) {
        setPairs((prev) => {
          const existingNames = new Set(prev.map((p) => p.name));
          const toAdd = validPairs.filter((p) => !existingNames.has(p.name));
          return [...prev, ...toAdd];
        });
      } else {
        setPairs(validPairs);
      }

      try {
        // Note: credentials are not passed here - the forecaster backend should use
        // the credentials already configured in the agent (shared backend state)
        await startForecast(basePath, {
          pairs: validPairs.map((p) => ({
            name: p.name,
            sourceDatastore: p.sourceDatastore,
            targetDatastore: p.targetDatastore,
          })),
        });
        finishBenchmarkStart();
      } catch (err) {
        stopPolling();

        if (err instanceof ForecastConflictError) {
          const redirected = await redirectToRunningBenchmark();
          if (!redirected) {
            setForecastStatus({
              state: "ready",
              pairs: [
                {
                  pairName: "conflict-error",
                  sourceDatastore: "",
                  targetDatastore: "",
                  state: "error",
                  error:
                    "A benchmark was started by another session but is no longer running. Please try again.",
                  completedRuns: 0,
                  totalRuns: 0,
                },
              ],
            });
            setBenchmarkDone(true);
          }
          return;
        }

        setForecastStatus({
          state: "ready",
          pairs: [
            {
              pairName: "start-error",
              sourceDatastore: "",
              targetDatastore: "",
              state: "error",
              error: err instanceof Error ? err.message : String(err),
              completedRuns: 0,
              totalRuns: 0,
            },
          ],
        });
        setBenchmarkDone(true);
      } finally {
        setRunLoading(false);
      }
    },
    [
      armWasRunning,
      basePath,
      closeSetupModal,
      completePairs,
      finishBenchmarkStart,
      markBenchmarkStarting,
      redirectToRunningBenchmark,
      stopPolling,
    ],
  );

  const handleRunFromSetupModal = useCallback(() => {
    if (!setupDraft) return;
    void runBenchmark(setupDraft.pairs, mergeDraftOnRun);
  }, [mergeDraftOnRun, runBenchmark, setupDraft]);

  const canRunFromModal =
    !!setupDraft &&
    credentialsSubmitted &&
    setupDraft.pairs.some(isCompletePair) &&
    !hasNoCaps &&
    setupDraft.vmAcknowledged;

  const isBenchmarkRunning = forecastStatus?.state === "running";

  return (
    <Stack hasGutter style={{ padding: "24px 0" }}>
      <StackItem>
        <Flex
          alignItems={{ default: "alignItemsCenter" }}
          gap={{ default: "gapSm" }}
        >
          <FlexItem>
            <Content component="h2" style={{ margin: 0 }}>
              Storage offload estimator
            </Content>
          </FlexItem>
          <FlexItem>
            <TechnologyPreviewBadge />
          </FlexItem>
        </Flex>
        <div
          style={{
            color: "var(--pf-t--global--text--color--200)",
            marginTop: "8px",
          }}
        >
          Estimate migration time between vSphere datastore pairs.
        </div>
      </StackItem>

      <StackItem>
        {pageView === "empty" ? (
          <StorageOffloadEmptyState
            onGetStarted={() => openSetupModal("initial")}
          />
        ) : (
          <StorageOffloadResultsView
            pairs={completePairs}
            statsMap={statsMap}
            runs={allRuns}
            isLoading={resultsLoading}
            forecastStatus={forecastStatus}
            benchmarkDone={benchmarkDone}
            onAddPair={() => openSetupModal("add-pairs")}
            onStartOver={reset}
            isBenchmarkRunning={isBenchmarkRunning}
          />
        )}
      </StackItem>

      {setupDraft && (
        <RunEstimateModal
          isOpen={isSetupModalOpen}
          onClose={closeSetupModal}
          draft={setupDraft}
          onDraftChange={setSetupDraft}
          datastores={datastores}
          groups={dsGroups}
          dsLoading={dsLoading}
          dsError={dsError}
          pairCapsMap={pairCapsMap}
          capsLoading={capsLoading}
          hasNoCaps={hasNoCaps}
          onRun={handleRunFromSetupModal}
          canRun={canRunFromModal}
          runLoading={runLoading}
        />
      )}
    </Stack>
  );
};

StorageOffloadTab.displayName = "StorageOffloadTab";

import { useInjection } from "@migration-planner-ui/ioc";
import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Symbols } from "../../main/Symbols";
import { useAgentStatus } from "../AgentStatusContext";
import type { DefaultApiInterface } from "../agentApi";
import { getLatestCollection } from "../collectionApi";
import { RunNewReportModal } from "./RunNewReportModal";
import { useRunNewReport } from "./useRunNewReport";

interface RunNewReportContextValue {
  isCollecting: boolean;
  collectorStatus: CollectorStatus["status"] | null;
  showReadyAlert: boolean;
  collectError: string | null;
  hasCollectionData: boolean;
  latestCollectionId: string | null;
  latestCollectionDate: Date | null;
  refetchCollections: () => Promise<void>;
  openModal: () => void;
  dismissReadyAlert: () => void;
  dismissCollectError: () => void;
  onCompleted: (listener: () => Promise<void>) => () => void;
}

const RunNewReportContext = createContext<RunNewReportContextValue | undefined>(
  undefined,
);

export const RunNewReportProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const { fetchStatus: refetchAgentStatus } = useAgentStatus();
  const listenersRef = useRef<Set<() => Promise<void>>>(new Set());
  const [latestCollectionId, setLatestCollectionId] = useState<string | null>(
    null,
  );
  const [latestCollectionDate, setLatestCollectionDate] = useState<Date | null>(
    null,
  );
  const [hasCollectionData, setHasCollectionData] = useState(false);

  const fetchCollectionData = useCallback(async () => {
    try {
      const collection = await getLatestCollection(agentApi);
      setLatestCollectionId(collection?.id ?? null);
      setLatestCollectionDate(collection?.createdAt ?? null);
      setHasCollectionData(Boolean(collection));
    } catch (err) {
      console.error("Error checking for existing collections:", err);
      setLatestCollectionId(null);
      setLatestCollectionDate(null);
      setHasCollectionData(false);
    }
  }, [agentApi]);

  useEffect(() => {
    void fetchCollectionData();
  }, [fetchCollectionData]);

  const onCompletedCallback = useCallback((listener: () => Promise<void>) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const handleCompleted = useCallback(async () => {
    await refetchAgentStatus();
    await fetchCollectionData();

    const results = Array.from(listenersRef.current).map((listener) =>
      listener().catch((err) => {
        console.error("Error in RunNewReport onCompleted listener:", err);
      }),
    );
    await Promise.all(results);
  }, [refetchAgentStatus, fetchCollectionData]);

  const {
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
  } = useRunNewReport(agentApi, { onCompleted: handleCompleted });

  const value: RunNewReportContextValue = {
    isCollecting,
    collectorStatus,
    showReadyAlert,
    collectError,
    hasCollectionData,
    latestCollectionId,
    latestCollectionDate,
    refetchCollections: fetchCollectionData,
    openModal,
    dismissReadyAlert,
    dismissCollectError,
    onCompleted: onCompletedCallback,
  };

  return (
    <RunNewReportContext.Provider value={value}>
      {children}
      <RunNewReportModal
        isOpen={isModalOpen}
        onConfirm={confirmRun}
        onCancel={closeModal}
      />
    </RunNewReportContext.Provider>
  );
};

export const useRunNewReportContext = (): RunNewReportContextValue => {
  const context = useContext(RunNewReportContext);
  if (context === undefined) {
    throw new Error(
      "useRunNewReportContext must be used within RunNewReportProvider",
    );
  }
  return context;
};

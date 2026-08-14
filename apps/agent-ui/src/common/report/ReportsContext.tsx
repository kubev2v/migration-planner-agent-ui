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
import type { DefaultApiInterface } from "../../api/agentApi";
import { getLatestCollection } from "../../api/collectionApi";
import { Symbols } from "../../main/Symbols";
import { useAgentStatus } from "../AgentStatusContext";
import { RunNewReportModal } from "./RunNewReportModal";
import { useReports } from "./useReports";

interface ReportsContextValue {
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

const ReportsContext = createContext<ReportsContextValue | undefined>(
  undefined,
);

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({
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
  } = useReports(agentApi, { onCompleted: handleCompleted });

  const value: ReportsContextValue = {
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
    <ReportsContext.Provider value={value}>
      {children}
      <RunNewReportModal
        isOpen={isModalOpen}
        onConfirm={confirmRun}
        onCancel={closeModal}
      />
    </ReportsContext.Provider>
  );
};

export const useReportsContext = (): ReportsContextValue => {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error("useReportsContext must be used within ReportsProvider");
  }
  return context;
};

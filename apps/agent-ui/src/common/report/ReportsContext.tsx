import type { CollectorStatus } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { createContext, useCallback, useContext } from "react";
import { getAgentApiClient } from "../../api/agentApiClient";
import { agentApiSlice } from "../../store/api/agentApiSlice";
import { useAppDispatch } from "../../store/hooks";
import { RunNewReportModal } from "./RunNewReportModal";
import { useReports } from "./useReports";

interface ReportsContextValue {
  isCollecting: boolean;
  collectorStatus: CollectorStatus["status"] | null;
  showReadyAlert: boolean;
  collectError: string | null;
  openModal: () => void;
  dismissReadyAlert: () => void;
  dismissCollectError: () => void;
}

/**
 * Tags invalidated when a collection run completes. A finished report produces a
 * new collection and can change agent status, so every query that reads from
 * that data must refetch. This union replaces the former `onCompleted` pub/sub
 * bus (three ad-hoc listeners across Groups, VMs overview and report comparison)
 * with a single tag-driven refetch through the shared cache.
 */
const REPORT_COMPLETED_TAGS = [
  "AgentStatus",
  "Collections",
  "Inventory",
  "Vms",
  "VmLabels",
  "Group",
  "GroupVms",
  "GroupInventory",
] as const;

const ReportsContext = createContext<ReportsContextValue | undefined>(
  undefined,
);

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentApi = getAgentApiClient();
  const dispatch = useAppDispatch();

  const handleCompleted = useCallback(async () => {
    dispatch(agentApiSlice.util.invalidateTags([...REPORT_COMPLETED_TAGS]));
  }, [dispatch]);

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
    openModal,
    dismissReadyAlert,
    dismissCollectError,
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

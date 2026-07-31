import { useInjection } from "@migration-planner-ui/ioc";
import type React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { DefaultApiInterface } from "../common/agentApi";
import { getLatestCollectionId } from "../common/collectionApi";
import { getCollectorStatus } from "../common/collectorApi";
import { isCollectorInProgress } from "../common/collectorStatus";
import { Symbols } from "../main/Symbols";
import { ReportLayout } from "./ReportLayout";

/**
 * Protected route wrapper for the report page.
 * Allows access when collector status is "collected", a refresh is in
 * progress, or at least one collection already exists.
 */
export const ProtectedReportRoute: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [isChecking, setIsChecking] = useState(true);
  const [hasCollectedData, setHasCollectedData] = useState(false);

  useEffect(() => {
    const checkCollectorStatus = async () => {
      try {
        const collectorStatus = await getCollectorStatus(agentApi);

        if (
          collectorStatus.status === "collected" ||
          isCollectorInProgress(collectorStatus.status)
        ) {
          setHasCollectedData(true);
          return;
        }

        const collectionId = await getLatestCollectionId(agentApi);
        setHasCollectedData(Boolean(collectionId));
      } catch (err) {
        console.error("Error checking collector status:", err);
        setHasCollectedData(false);
      } finally {
        setIsChecking(false);
      }
    };

    void checkCollectorStatus();
  }, [agentApi]);

  if (isChecking) {
    return null;
  }

  if (!hasCollectedData) {
    return <Navigate to="/login" replace />;
  }

  return <ReportLayout />;
};

ProtectedReportRoute.displayName = "ProtectedReportRoute";

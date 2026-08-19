import { useInjection } from "@openshift-migration-advisor/ioc";
import type React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { DefaultApiInterface } from "../api/agentApi";
import { getLatestCollectionId } from "../api/collectionApi";
import { getCollectorStatus } from "../api/collectorApi";
import { newAbortSignal } from "../common/AbortSignal";
import { isCollectorInProgress } from "../common/collectorStatus";
import { Symbols } from "../main/Symbols";
import { PageLayout } from "./PageLayout";

/**
 * Protected route wrapper for the application.
 * Allows access when collector status is "collected", a refresh is in
 * progress, or at least one collection already exists.
 */
export const ProtectedRoute: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [isChecking, setIsChecking] = useState(true);
  const [hasCollectedData, setHasCollectedData] = useState(false);

  useEffect(() => {
    const checkCollectorStatus = async () => {
      const signal = newAbortSignal("Collector status request timed out.");

      try {
        const collectorStatus = await getCollectorStatus(agentApi, { signal });

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

  return <PageLayout />;
};

ProtectedRoute.displayName = "ProtectedRoute";

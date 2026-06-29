import { useInjection } from "@migration-planner-ui/ioc";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { newAbortSignal } from "../common/AbortSignal";
import { Symbols } from "../main/Symbols";
import { ReportLayout } from "./ReportLayout";

/**
 * Protected route wrapper for the report page.
 * Redirects to login if collector status is not "collected".
 */
export const ProtectedReportRoute: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [isChecking, setIsChecking] = useState(true);
  const [hasCollectedData, setHasCollectedData] = useState(false);

  useEffect(() => {
    const signal = newAbortSignal("Collector status request timed out.");

    const checkCollectorStatus = async () => {
      try {
        const collectorStatus = await agentApi.getCollectorStatus({ signal });

        // Only allow access if data has been collected
        if (collectorStatus.status === "collected") {
          setHasCollectedData(true);
        }
      } catch (err) {
        // Handle AbortError and other errors
        if (err instanceof Error && err.name === "AbortError") {
          console.warn("Collector status request timed out");
        } else {
          console.error("Error checking collector status:", err);
        }
        // On error, redirect to login for safety
        setHasCollectedData(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkCollectorStatus();
  }, [agentApi]);

  // Show nothing while checking (could show a loading spinner if desired)
  if (isChecking) {
    return null;
  }

  // Redirect to login if no data has been collected
  if (!hasCollectedData) {
    return <Navigate to="/login" replace />;
  }

  return <ReportLayout />;
};

ProtectedReportRoute.displayName = "ProtectedReportRoute";

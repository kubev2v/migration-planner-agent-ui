import type { DefaultApiInterface } from "@migration-planner-ui/agent-client/apis";
import { useInjection } from "@migration-planner-ui/ioc";
import type React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { newAbortSignal } from "../../common/AbortSignal";
import { REQUEST_TIMEOUT_MS } from "../../login-form/Constants";
import { Symbols } from "../../main/Symbols";
import ReportPage from "./ReportPage";

/**
 * Protected route wrapper for the report page.
 * Redirects to login if collector status is not "collected".
 */
export const ProtectedReportRoute: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [isChecking, setIsChecking] = useState(true);
  const [hasCollectedData, setHasCollectedData] = useState(false);

  useEffect(() => {
    const signal = newAbortSignal(
      REQUEST_TIMEOUT_MS,
      "Collector status request timed out.",
    );

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

  // Allow access to report page
  return <ReportPage />;
};

ProtectedReportRoute.displayName = "ProtectedReportRoute";

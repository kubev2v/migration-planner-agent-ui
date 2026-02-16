import type { DefaultApiInterface } from "@migration-planner-ui/agent-client/apis";
import type {
  CollectorStartRequest,
  CollectorStatus,
} from "@migration-planner-ui/agent-client/models";
import { useInjection } from "@migration-planner-ui/ioc";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTitle } from "react-use";
import { newAbortSignal } from "../../common/AbortSignal";
import type { ApiError } from "../../common/components/index";
import { Symbols } from "../../main/Symbols";
import { REQUEST_TIMEOUT_MS } from "../Constants";
import type { Credentials } from "../LoginFormComponent";

// Maximum consecutive polling failures before reporting error to user
const MAX_POLL_FAILURES = 5;

export interface LoginViewModelInterface {
  version: string | undefined;
  isDataShared: boolean;
  isCollecting: boolean;
  status: CollectorStatus["status"] | null;
  error: ApiError | null;
  onCollect: (credentials: Credentials, isDataShared: boolean) => Promise<void>;
  onCancel: () => Promise<void>;
}

export const useLoginViewModel = (): LoginViewModelInterface => {
  useTitle("Login - Migration Discovery VM");
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const navigate = useNavigate();
  const [version] = useState<string | undefined>("v0.0.0");
  const [isDataShared] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [status, setStatus] = useState<CollectorStatus["status"] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Track consecutive polling failures to surface persistent errors
  const pollFailuresRef = useRef<number>(0);

  // Check collector status on mount to redirect if already collected
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const signal = newAbortSignal(
          REQUEST_TIMEOUT_MS,
          "Initial collector status request timed out.",
        );
        const collectorStatus = await agentApi.getCollectorStatus({ signal });

        // If already collected, redirect to report page
        if (collectorStatus.status === "collected") {
          navigate("/report");
        }
      } catch (err) {
        // Silently fail - user can still use login form
        console.warn("Failed to check initial collector status:", err);
      }
    };

    checkInitialStatus();
  }, [agentApi, navigate]);

  // Poll collector status periodically when collecting
  useEffect(() => {
    if (!isCollecting) {
      return;
    }

    // Reset failure counter when polling starts
    pollFailuresRef.current = 0;

    const pollStatus = async () => {
      try {
        // Create a timed abort signal to prevent requests from piling up
        const signal = newAbortSignal(
          REQUEST_TIMEOUT_MS,
          "Collector status request timed out.",
        );

        const collectorStatus = await agentApi.getCollectorStatus({ signal });

        // Clear failure counter on successful response
        pollFailuresRef.current = 0;
        setStatus(collectorStatus.status);

        // Check if collection is complete or has error
        if (collectorStatus.status === "collected") {
          // Navigate to report page using client-side navigation
          navigate("/report");
        } else if (collectorStatus.status === "error") {
          setIsCollecting(false);
          setError({
            message: collectorStatus.error || "Collection failed",
          });
        }
      } catch (err) {
        // Handle AbortError (timeout) separately - log but don't show error to user
        if (err instanceof Error && err.name === "AbortError") {
          console.warn(
            "Collector status poll timed out, will retry on next interval",
          );
          // Don't increment failure counter for timeouts - they're expected to retry
        } else {
          // Increment consecutive failure counter
          pollFailuresRef.current += 1;
          console.error(
            `Error polling collector status (failure ${pollFailuresRef.current}/${MAX_POLL_FAILURES}):`,
            err,
          );

          // If threshold exceeded, surface error to user and stop polling
          if (pollFailuresRef.current >= MAX_POLL_FAILURES) {
            setIsCollecting(false);
            setError({
              message:
                err instanceof Error
                  ? `Failed to check collection status: ${err.message}`
                  : "Failed to check collection status after multiple attempts",
            });
          }
        }
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial call

    return () => {
      clearInterval(interval);
      // Reset failure counter on cleanup
      pollFailuresRef.current = 0;
    };
  }, [isCollecting, agentApi, navigate]);

  const onCollect = useCallback(
    async (credentials: Credentials, _isDataShared: boolean) => {
      setError(null);
      setIsCollecting(true);
      setStatus("connecting");
      // Reset failure counter when starting new collection
      pollFailuresRef.current = 0;

      try {
        const collectorRequest: CollectorStartRequest = {
          url: credentials.url,
          username: credentials.username,
          password: credentials.password,
        };

        const signal = newAbortSignal(
          REQUEST_TIMEOUT_MS,
          "The server didn't respond in a timely fashion.",
        );

        await agentApi.startCollector(
          { collectorStartRequest: collectorRequest },
          { signal },
        );
        // Status will be updated by the polling effect
        // Note: _isDataShared is accepted for interface compatibility but not currently used in the API
      } catch (err) {
        setIsCollecting(false);
        setStatus(null);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to start collection";
        setError({ message: errorMessage });
        console.error("Error starting collection:", err);
      }
    },
    [agentApi],
  );

  const onCancel = useCallback(async () => {
    try {
      await agentApi.stopCollector();
      setIsCollecting(false);
      setStatus(null);
      setError(null);
      // Reset failure counter when cancelling
      pollFailuresRef.current = 0;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel collection";
      setError({ message: errorMessage });
      console.error("Error canceling collection:", err);
    }
  }, [agentApi]);

  return {
    version,
    isDataShared,
    isCollecting,
    status,
    error,
    onCollect,
    onCancel,
  };
};

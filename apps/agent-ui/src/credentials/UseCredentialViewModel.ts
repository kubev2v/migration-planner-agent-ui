import type {
  CollectorStatus,
  VcenterCredentials,
} from "@openshift-migration-advisor/agent-sdk";
import { useInjection } from "@openshift-migration-advisor/ioc";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DefaultApiInterface } from "../api/agentApi";
import { getCollectorStatus } from "../api/collectorApi";
import { newAbortSignal } from "../common/AbortSignal";
import type { ApiError } from "../common/components/index";
import { parseApiError } from "../common/parseApiError";
import { Symbols } from "../main/Symbols";
import { usePutCredentialsMutation } from "../store/api/credentialsEndpoints";

// Maximum consecutive polling failures before reporting error to user
const MAX_POLL_FAILURES = 5;

export interface LoginViewModelInterface {
  version: string | undefined;
  isCollecting: boolean;
  status: CollectorStatus["status"] | null;
  error: ApiError | null;
  onCollect: (
    credentials: VcenterCredentials,
    isDataShared: boolean,
  ) => Promise<void>;
  onCancel: () => Promise<void>;
}

interface UseLoginViewModelProps {
  refetchAgentStatus?: () => Promise<void>;
}

export const useLoginViewModel = (
  props?: UseLoginViewModelProps,
): LoginViewModelInterface => {
  const [putCredentials] = usePutCredentialsMutation();
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const navigate = useNavigate();
  const refetchAgentStatus = props?.refetchAgentStatus;
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [shouldPollCollector, setShouldPollCollector] = useState(false);
  const [status, setStatus] = useState<CollectorStatus["status"] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Track consecutive polling failures to surface persistent errors
  const pollFailuresRef = useRef<number>(0);

  // Fetch agent version on mount
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const versionInfo = await agentApi.getVersion();
        setVersion(versionInfo.version);
      } catch (err) {
        console.warn("Failed to fetch agent version:", err);
      }
    };

    fetchVersion();
  }, [agentApi]);

  // Check collector status on mount to redirect if already collected
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const collectorStatus = await getCollectorStatus(agentApi);

        if (collectorStatus.status === "collected") {
          navigate("/report");
        }
      } catch (err) {
        console.warn("Failed to check initial collector status:", err);
      }
    };

    checkInitialStatus();
  }, [agentApi, navigate]);

  // Poll collector status after the new collector run has started.
  useEffect(() => {
    if (!shouldPollCollector) {
      return;
    }

    pollFailuresRef.current = 0;

    const pollStatus = async () => {
      try {
        const signal = newAbortSignal("Collector status request timed out.");
        const collectorStatus = await getCollectorStatus(agentApi, { signal });

        pollFailuresRef.current = 0;
        setStatus(collectorStatus.status);

        if (collectorStatus.status === "collected") {
          navigate("/report");
        } else if (collectorStatus.status === "error") {
          setShouldPollCollector(false);
          setIsCollecting(false);
          setError({
            message: collectorStatus.error || "Collection failed",
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.warn(
            "Collector status poll timed out, will retry on next interval",
          );
        } else {
          pollFailuresRef.current += 1;
          console.error(
            `Error polling collector status (failure ${pollFailuresRef.current}/${MAX_POLL_FAILURES}):`,
            err,
          );

          if (pollFailuresRef.current >= MAX_POLL_FAILURES) {
            setShouldPollCollector(false);
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

    const interval = setInterval(pollStatus, 2000);
    pollStatus();

    return () => {
      clearInterval(interval);
      pollFailuresRef.current = 0;
    };
  }, [shouldPollCollector, agentApi, navigate]);

  const onCollect = useCallback(
    async (credentials: VcenterCredentials, isDataShared: boolean) => {
      setError(null);
      setIsCollecting(true);
      setShouldPollCollector(false);
      setStatus("connecting");
      pollFailuresRef.current = 0;

      let modeChangeSucceeded = false;

      try {
        if (isDataShared) {
          const signal = newAbortSignal(
            "The server didn't respond in a timely fashion.",
          );

          await agentApi.setAgentMode(
            { agentModeRequest: { mode: "connected" } },
            { signal },
          );
          modeChangeSucceeded = true;

          if (refetchAgentStatus) {
            try {
              await refetchAgentStatus();
            } catch (refetchErr) {
              console.error("Failed to refetch agent status:", refetchErr);
            }
          }
        }

        await putCredentials({
          vcenterCredentials: {
            url: credentials.url,
            username: credentials.username,
            password: credentials.password,
          },
        }).unwrap();

        const signal = newAbortSignal(
          "The server didn't respond in a timely fashion.",
        );

        const started = await agentApi.startCollector({ signal });
        setStatus(started.status);
        setShouldPollCollector(true);
      } catch (err) {
        setShouldPollCollector(false);
        setIsCollecting(false);
        setStatus(null);

        let fallbackMessage: string;
        if (modeChangeSucceeded) {
          fallbackMessage =
            "Data sharing was enabled, but failed to start collection";
        } else if (isDataShared && !modeChangeSucceeded) {
          fallbackMessage = "Failed to enable data sharing";
        } else {
          fallbackMessage = "Failed to start collection";
        }

        const errorMessage = await parseApiError(err, fallbackMessage);
        setError({ message: errorMessage });
        console.error("Error during collection start:", err);
      }
    },
    [agentApi, putCredentials, refetchAgentStatus],
  );

  const onCancel = useCallback(async () => {
    try {
      await agentApi.stopCollector();
      setShouldPollCollector(false);
      setIsCollecting(false);
      setStatus(null);
      setError(null);
      pollFailuresRef.current = 0;
    } catch (err) {
      const errorMessage = await parseApiError(
        err,
        "Failed to cancel collection",
      );
      setError({ message: errorMessage });
      console.error("Error canceling collection:", err);
    }
  }, [agentApi]);

  return {
    version,
    isCollecting,
    status,
    error,
    onCollect,
    onCancel,
  };
};

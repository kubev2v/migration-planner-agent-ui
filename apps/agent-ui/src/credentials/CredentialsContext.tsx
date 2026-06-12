import { useInjection } from "@migration-planner-ui/ioc";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Symbols } from "../main/Symbols";
import { getAgentApiBasePath } from "../pages/Report/agentApiConfig";
import {
  checkFeaturePermissions,
  deleteCredentials,
  getCredentials,
  putCredentials,
  refreshCredentials,
} from "./credentialsApi";
import type {
  CredentialFeature,
  CredentialStatus,
  VcenterCredentials,
} from "./credentialsTypes";
import {
  clearPersistedUsername,
  loadPersistedUsername,
  persistUsername,
} from "./credentialsTypes";

interface FeaturePermissions {
  missingPrivileges: string[];
  checked: boolean;
}

interface CredentialsContextValue {
  status: CredentialStatus | null;
  loading: boolean;
  inspectorPermissions: FeaturePermissions;
  forecasterPermissions: FeaturePermissions;
  refresh: () => Promise<void>;
  saveCredentials: (credentials: VcenterCredentials) => Promise<void>;
  checkPermissions: (
    feature: CredentialFeature,
    inlineCredentials?: VcenterCredentials,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const emptyPermissions = (): FeaturePermissions => ({
  missingPrivileges: [],
  checked: false,
});

const CredentialsContext = createContext<CredentialsContextValue | undefined>(
  undefined,
);

export const CredentialsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const navigate = useNavigate();
  const basePath = useMemo(() => getAgentApiBasePath(agentApi), [agentApi]);

  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectorPermissions, setInspectorPermissions] =
    useState<FeaturePermissions>(emptyPermissions);
  const [forecasterPermissions, setForecasterPermissions] =
    useState<FeaturePermissions>(emptyPermissions);

  const applyStatus = useCallback((next: CredentialStatus | null) => {
    setStatus(next);
    if (next?.username) {
      persistUsername(next.username);
    }
  }, []);

  const checkPermissions = useCallback(
    async (
      feature: CredentialFeature,
      inlineCredentials?: VcenterCredentials,
    ) => {
      const result = await checkFeaturePermissions(
        basePath,
        feature,
        inlineCredentials,
      );
      const next: FeaturePermissions = {
        missingPrivileges: result.missingPrivileges,
        checked: true,
      };
      if (feature === "inspector") {
        setInspectorPermissions(next);
      } else {
        setForecasterPermissions(next);
      }
    },
    [basePath],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getCredentials(basePath);
      if (stored) {
        applyStatus({
          ...stored,
          username: stored.username || loadPersistedUsername(),
        });
        await Promise.all([
          checkPermissions("inspector"),
          checkPermissions("forecaster"),
        ]);
      } else {
        applyStatus(null);
        setInspectorPermissions(emptyPermissions());
        setForecasterPermissions(emptyPermissions());
      }
    } catch (err) {
      console.error("Failed to load credentials:", err);
      const username = loadPersistedUsername();
      if (username) {
        applyStatus({ url: "", username, valid: false });
      }
    } finally {
      setLoading(false);
    }
  }, [applyStatus, basePath, checkPermissions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = useCallback(async () => {
    const next = await refreshCredentials(basePath);
    applyStatus({
      ...next,
      username: next.username || loadPersistedUsername(),
    });
    await Promise.all([
      checkPermissions("inspector"),
      checkPermissions("forecaster"),
    ]);
  }, [applyStatus, basePath, checkPermissions]);

  const saveCredentials = useCallback(
    async (credentials: VcenterCredentials) => {
      const next = await putCredentials(basePath, credentials);
      applyStatus(next);
      persistUsername(credentials.username.trim());
      await Promise.all([
        checkPermissions(
          "inspector",
          credentials.password ? credentials : undefined,
        ),
        checkPermissions(
          "forecaster",
          credentials.password ? credentials : undefined,
        ),
      ]);
    },
    [applyStatus, basePath, checkPermissions],
  );

  const logout = useCallback(async () => {
    try {
      await deleteCredentials(basePath);
    } catch (err) {
      console.error("Failed to delete credentials:", err);
    }
    clearPersistedUsername();
    setStatus(null);
    setInspectorPermissions(emptyPermissions());
    setForecasterPermissions(emptyPermissions());
    navigate("/login");
  }, [basePath, navigate]);

  const value: CredentialsContextValue = {
    status,
    loading,
    inspectorPermissions,
    forecasterPermissions,
    refresh,
    saveCredentials,
    checkPermissions,
    logout,
  };

  return (
    <CredentialsContext.Provider value={value}>
      {children}
    </CredentialsContext.Provider>
  );
};

export const useCredentials = (): CredentialsContextValue => {
  const context = useContext(CredentialsContext);
  if (context === undefined) {
    throw new Error("useCredentials must be used within CredentialsProvider");
  }
  return context;
};

import { useInjection } from "@migration-planner-ui/ioc";
import type {
  CapabilityStatusCapabilities,
  CredentialStatus,
  DefaultApiInterface,
  VcenterCredentials,
} from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { parseApiError } from "../common/parseApiError";
import { Symbols } from "../main/Symbols";
import { getCapabilities, getCredentialStatus } from "./credentialsApi";

interface CredentialsContextValue {
  credentialStatus: CredentialStatus | null;
  capabilities: CapabilityStatusCapabilities | null;
  isLoading: boolean;
  error: string | null;
  isEditModalOpen: boolean;
  openEditModal: () => void;
  closeEditModal: () => void;
  clearError: () => void;
  fetchCredentialsAndCapabilities: () => Promise<void>;
  updateCredential: (credentials: VcenterCredentials) => Promise<void>;
  disconnectCredential: () => Promise<void>;
}

const CredentialsContext = createContext<CredentialsContextValue | undefined>(
  undefined,
);

export const CredentialsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [credentialStatus, setCredentialStatus] =
    useState<CredentialStatus | null>(null);
  const [capabilities, setCapabilities] =
    useState<CapabilityStatusCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchCredentialsAndCapabilities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [credentialsStatus, capabilitiyStatus] = await Promise.all([
        getCredentialStatus(agentApi),
        getCapabilities(agentApi),
      ]);
      setCredentialStatus(credentialsStatus);
      setCapabilities(capabilitiyStatus);
    } catch (err) {
      setError(await parseApiError(err, "Failed to load credentials."));
    } finally {
      setIsLoading(false);
    }
  }, [agentApi]);

  const updateCredential = useCallback(
    async (newCredentials: VcenterCredentials) => {
      try {
        setIsLoading(true);
        setError(null);
        const credentialStatus = await agentApi.putCredentials({
          vcenterCredentials: newCredentials,
        });
        const capabilityStatus = await getCapabilities(agentApi);
        setCredentialStatus(credentialStatus);
        setCapabilities(capabilityStatus);
      } catch (err) {
        setError(await parseApiError(err, "Failed to update credentials."));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [agentApi],
  );

  const disconnectCredential = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await agentApi.deleteCredentials();
      setCredentialStatus(null);
      setCapabilities(null);
    } catch (err) {
      setError(await parseApiError(err, "Failed to disconnect."));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [agentApi]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const openEditModal = useCallback(() => {
    clearError();
    setIsEditModalOpen(true);
  }, [clearError]);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  useEffect(() => {
    fetchCredentialsAndCapabilities();
  }, [fetchCredentialsAndCapabilities]);

  const value: CredentialsContextValue = useMemo<CredentialsContextValue>(
    () => ({
      credentialStatus,
      capabilities,
      isLoading,
      error,
      isEditModalOpen,
      openEditModal,
      closeEditModal,
      fetchCredentialsAndCapabilities,
      updateCredential,
      disconnectCredential,
      clearError,
    }),
    [
      credentialStatus,
      capabilities,
      isLoading,
      error,
      isEditModalOpen,
      openEditModal,
      closeEditModal,
      fetchCredentialsAndCapabilities,
      updateCredential,
      disconnectCredential,
      clearError,
    ],
  );

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

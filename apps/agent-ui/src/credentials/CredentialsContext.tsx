import { css } from "@emotion/css";
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

export type CredentialStatusType =
  | "error"
  | "loading"
  | "connected"
  | "removed"
  | "editing";

interface CredentialsContextValue {
  hasCredentials: boolean;
  credentialStatus: CredentialStatus | null;
  credentialStatusType: CredentialStatusType;
  capabilities: CapabilityStatusCapabilities | null;
  isLoading: boolean;
  error: string | null;
  isEditModalOpen: boolean;
  openEditModal: (onSuccess?: () => void) => void;
  closeEditModal: (triggerSuccessCallback?: boolean) => void;
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
  const hasCredentials = credentialStatus !== null;
  const [onSuccessCallback, setOnSuccessCallback] = useState<
    (() => void) | null
  >(null);

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

  const openEditModal = useCallback(
    (onSuccess?: () => void) => {
      clearError();
      setOnSuccessCallback(() => onSuccess);
      setIsEditModalOpen(true);
    },
    [clearError],
  );

  const closeEditModal = useCallback(
    (triggerSuccessCallback?: boolean) => {
      setIsEditModalOpen(false);
      if (triggerSuccessCallback && onSuccessCallback) {
        onSuccessCallback();
      }
      setOnSuccessCallback(null);
    },
    [onSuccessCallback],
  );

  useEffect(() => {
    fetchCredentialsAndCapabilities();
  }, [fetchCredentialsAndCapabilities]);

  const credentialStatusType = useMemo<CredentialStatusType>(() => {
    if (isEditModalOpen) return "editing";
    if (error) return "error";
    if (isLoading) return "loading";
    if (credentialStatus?.valid) return "connected";
    return "removed";
  }, [error, isLoading, isEditModalOpen, credentialStatus]);

  const value: CredentialsContextValue = useMemo<CredentialsContextValue>(
    () => ({
      hasCredentials,
      credentialStatus,
      credentialStatusType,
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
      hasCredentials,
      credentialStatus,
      credentialStatusType,
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

export function buildCapabilityUIState(
  capability: keyof CapabilityStatusCapabilities,
  credentialStatus: CredentialStatus | null,
  capabilities: CapabilityStatusCapabilities | null,
) {
  const hasValidCredentials = credentialStatus?.valid === true;
  const operationCapability = capabilities?.[capability];
  const isAvailable = operationCapability?.enabled ?? false;
  const missingPrivileges = operationCapability?.missingPrivileges ?? [];

  const shouldShowTooltip = !isAvailable && missingPrivileges.length > 0;
  const shouldRequestCredentials = !hasValidCredentials;

  return {
    shouldShowTooltip,
    shouldRequestCredentials,
  };
}

export interface CapabilityStatus {
  shouldShowTooltip: boolean;
  shouldRequestCredentials: boolean;
  errorTooltipContent?: React.ReactNode;
  openEditModal: (onSuccess?: () => void) => void;
}

const tooltipListStyles = css`
  padding-left: 20px;
  margin: 4px 0 0 0;
`;

export const useCapability = (
  capability: keyof CapabilityStatusCapabilities,
): CapabilityStatus => {
  const { capabilities, openEditModal, credentialStatus } = useCredentials();

  const uiState = buildCapabilityUIState(
    capability,
    credentialStatus,
    capabilities,
  );
  const operationCapability = capabilities?.[capability];
  const missingPrivileges = operationCapability?.missingPrivileges ?? [];
  const errorTooltipContent = (
    <div>
      You don't have the required permissions to perform this action. Contact
      your vCenter organization administrator for help.
      <br />
      <br />
      <strong>Required permissions:</strong>
      <ul className={tooltipListStyles}>
        {missingPrivileges.map((privilege) => (
          <li key={privilege}>{privilege}</li>
        ))}
      </ul>
    </div>
  );
  return {
    ...uiState,
    errorTooltipContent,
    openEditModal,
  };
};

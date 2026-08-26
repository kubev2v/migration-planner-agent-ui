import { css } from "@emotion/css";
import type {
  CapabilityStatusCapabilities,
  CredentialStatus,
} from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import {
  useGetCredentialCapabilitiesQuery,
  useGetCredentialsQuery,
} from "../store/api/credentialsEndpoints";
import { useCredentialsModal } from "./CredentialsModalController";

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
  const { data: credentialStatus = null } = useGetCredentialsQuery();
  const { data: capabilities = null } = useGetCredentialCapabilitiesQuery();
  const { openEditModal } = useCredentialsModal();

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

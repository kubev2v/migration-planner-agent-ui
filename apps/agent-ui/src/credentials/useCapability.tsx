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

export function buildCapabilityUIState(
  capability: keyof CapabilityStatusCapabilities,
  credentialStatus: CredentialStatus | null,
  capabilities: CapabilityStatusCapabilities | null,
  isPending = false,
) {
  const hasValidCredentials = credentialStatus?.valid === true;
  const operationCapability = capabilities?.[capability];
  const isAvailable = operationCapability?.enabled ?? false;
  const missingPrivileges = operationCapability?.missingPrivileges ?? [];

  // While the credential/capability queries are still resolving, `null` data is
  // indistinguishable from a confirmed no-credentials (404) response. Defer any
  // protected action until we have a real answer so we don't pop the
  // credentials modal for users whose valid credentials just haven't loaded.
  const shouldShowTooltip =
    !isPending && !isAvailable && missingPrivileges.length > 0;
  const shouldRequestCredentials = !isPending && !hasValidCredentials;

  return {
    isPending,
    shouldShowTooltip,
    shouldRequestCredentials,
  };
}

export interface CapabilityStatus {
  isPending: boolean;
  shouldShowTooltip: boolean;
  shouldRequestCredentials: boolean;
  errorTooltipContent?: React.ReactNode;
}

const tooltipListStyles = css`
  padding-left: 20px;
  margin: 4px 0 0 0;
`;

export const useCapability = (
  capability: keyof CapabilityStatusCapabilities,
): CapabilityStatus => {
  const { data: credentialStatus = null, isLoading: isCredentialsLoading } =
    useGetCredentialsQuery();
  const { data: capabilities = null, isLoading: isCapabilitiesLoading } =
    useGetCredentialCapabilitiesQuery();

  const isPending = isCredentialsLoading || isCapabilitiesLoading;

  const uiState = buildCapabilityUIState(
    capability,
    credentialStatus,
    capabilities,
    isPending,
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
  };
};

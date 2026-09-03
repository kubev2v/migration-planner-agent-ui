import { css } from "@emotion/css";
import type { CapabilityStatusCapabilities } from "@openshift-migration-advisor/agent-sdk";
import type React from "react";
import { useAgentStatus } from "../common/useAgentStatus";
import {
  useGetCredentialCapabilitiesQuery,
  useGetCredentialsQuery,
} from "../store/api/credentialsEndpoints";

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
  const { isRvtoolsMode } = useAgentStatus();

  const isPending = isCredentialsLoading || isCapabilitiesLoading;

  if (isPending) {
    return {
      isPending: true,
      shouldShowTooltip: false,
      shouldRequestCredentials: false,
    };
  }

  if (isRvtoolsMode) {
    return {
      isPending: false,
      shouldShowTooltip: true,
      shouldRequestCredentials: false,
      errorTooltipContent: (
        <div>
          You're in RVTools mode and don't have access to connected mode
          features.
        </div>
      ),
    };
  }

  const operationCapability = capabilities?.[capability];
  const isAvailable = operationCapability?.enabled ?? false;
  const missingPrivileges = operationCapability?.missingPrivileges ?? [];

  return {
    isPending: false,
    shouldShowTooltip: !isAvailable && missingPrivileges.length > 0,
    shouldRequestCredentials: credentialStatus?.valid !== true,
    errorTooltipContent: (
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
    ),
  };
};

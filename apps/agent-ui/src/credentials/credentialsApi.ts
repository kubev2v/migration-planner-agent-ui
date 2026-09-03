import type {
  CapabilityStatusCapabilities,
  CredentialStatus,
} from "@openshift-migration-advisor/agent-sdk";
import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../api/agentApi";

export async function getCredentialStatus(
  agentApi: DefaultApiInterface,
): Promise<CredentialStatus | null> {
  try {
    return await agentApi.getCredentials();
  } catch (err) {
    if (err instanceof ResponseError && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function getCapabilities(
  agentApi: DefaultApiInterface,
): Promise<CapabilityStatusCapabilities | null> {
  try {
    const capabilityStatus = await agentApi.getCredentialCapabilities();
    return capabilityStatus.capabilities;
  } catch (err) {
    if (err instanceof ResponseError && err.response?.status === 501) {
      return {
        collector: {
          enabled: false,
          missingPrivileges: [],
        },
        inspector: {
          enabled: false,
          missingPrivileges: [],
        },
        forecaster: {
          enabled: false,
          missingPrivileges: [],
        },
      };
    }

    if (err instanceof ResponseError && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

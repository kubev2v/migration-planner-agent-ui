import type {
  CapabilityStatusCapabilities,
  CredentialStatus,
} from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, test } from "vitest";
import { buildCapabilityUIState } from "./CredentialsContext";

describe("buildCapabilityUIState", () => {
  test("Should build state when 404 is returned for both credentials and capabilities", () => {
    const credentialStatus = null;
    const capabilities = null;
    const state = buildCapabilityUIState(
      "forecaster",
      credentialStatus,
      capabilities,
    );
    expect(state.shouldShowTooltip).toBe(false);
    expect(state.shouldRequestCredentials).toBe(true);
  });
  test("Should display the tooltip if credentials are valid but not enough permissions", () => {
    const credentialStatus: CredentialStatus = {
      url: "https://vcenter.example.com/sdk",
      username: "admin@vsphere.local",
      valid: true,
    };
    const capabilities: CapabilityStatusCapabilities = {
      collector: {
        enabled: true,
      },
      inspector: {
        enabled: true,
      },
      forecaster: {
        enabled: false,
        missingPrivileges: ["p1", "p2"],
      },
    };
    const state = buildCapabilityUIState(
      "forecaster",
      credentialStatus,
      capabilities,
    );
    expect(state.shouldShowTooltip).toBe(true);
    expect(state.shouldRequestCredentials).toBe(false);
  });
  test("Should not display the tooltip if credentials are valid and enough permissions", () => {
    const credentialStatus: CredentialStatus = {
      url: "https://vcenter.example.com/sdk",
      username: "admin@vsphere.local",
      valid: true,
    };
    const capabilities: CapabilityStatusCapabilities = {
      collector: {
        enabled: true,
      },
      inspector: {
        enabled: true,
      },
      forecaster: {
        enabled: true,
      },
    };
    const state = buildCapabilityUIState(
      "forecaster",
      credentialStatus,
      capabilities,
    );
    expect(state.shouldShowTooltip).toBe(false);
    expect(state.shouldRequestCredentials).toBe(false);
  });
  test("Should ask for credentials if returned but invalid", () => {
    const credentialStatus: CredentialStatus = {
      url: "https://vcenter.example.com/sdk",
      username: "admin@vsphere.local",
      valid: false,
    };
    const capabilities: CapabilityStatusCapabilities = {
      collector: {
        enabled: true,
      },
      inspector: {
        enabled: true,
      },
      forecaster: {
        enabled: true,
      },
    };
    const state = buildCapabilityUIState(
      "forecaster",
      credentialStatus,
      capabilities,
    );
    expect(state.shouldShowTooltip).toBe(false);
    expect(state.shouldRequestCredentials).toBe(true);
  });
});

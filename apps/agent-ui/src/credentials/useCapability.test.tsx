import type {
  CapabilityStatusCapabilities,
  CredentialStatus,
} from "@openshift-migration-advisor/agent-sdk";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useAgentStatus } from "../common/useAgentStatus";
import {
  useGetCredentialCapabilitiesQuery,
  useGetCredentialsQuery,
} from "../store/api/credentialsEndpoints";
import { useCapability } from "./useCapability";

vi.mock("../common/useAgentStatus", () => ({
  useAgentStatus: vi.fn(),
}));

vi.mock("../store/api/credentialsEndpoints", () => ({
  useGetCredentialsQuery: vi.fn(),
  useGetCredentialCapabilitiesQuery: vi.fn(),
}));

const validCredentials: CredentialStatus = {
  url: "https://vcenter.example.com/sdk",
  username: "admin@vsphere.local",
  valid: true,
};

function mockHooks({
  credentials,
  isCredentialsLoading = false,
  capabilities,
  isCapabilitiesLoading = false,
  isRvtoolsMode = false,
}: {
  credentials?: CredentialStatus | null;
  isCredentialsLoading?: boolean;
  capabilities?: CapabilityStatusCapabilities | null;
  isCapabilitiesLoading?: boolean;
  isRvtoolsMode?: boolean;
}) {
  vi.mocked(useGetCredentialsQuery).mockReturnValue({
    data: credentials ?? null,
    isLoading: isCredentialsLoading,
  } as unknown as ReturnType<typeof useGetCredentialsQuery>);
  vi.mocked(useGetCredentialCapabilitiesQuery).mockReturnValue({
    data: capabilities ?? null,
    isLoading: isCapabilitiesLoading,
  } as unknown as ReturnType<typeof useGetCredentialCapabilitiesQuery>);
  vi.mocked(useAgentStatus).mockReturnValue({
    isRvtoolsMode,
  } as ReturnType<typeof useAgentStatus>);
}

describe("useCapability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Should be pending while queries are still loading", () => {
    mockHooks({ isCredentialsLoading: true });
    const { result } = renderHook(() => useCapability("forecaster"));
    expect(result.current.isPending).toBe(true);
    expect(result.current.shouldShowTooltip).toBe(false);
    expect(result.current.shouldRequestCredentials).toBe(false);
  });

  test("Should show the RVTools tooltip in RVTools mode", () => {
    mockHooks({ isRvtoolsMode: true });
    const { result } = renderHook(() => useCapability("forecaster"));
    expect(result.current.isPending).toBe(false);
    expect(result.current.shouldShowTooltip).toBe(true);
    expect(result.current.shouldRequestCredentials).toBe(false);
    expect(result.current.errorTooltipContent).toBeDefined();
  });

  test("Should show the tooltip when credentials are valid but privileges are missing", () => {
    mockHooks({
      credentials: validCredentials,
      capabilities: {
        collector: { enabled: true },
        inspector: { enabled: true },
        forecaster: { enabled: false, missingPrivileges: ["p1", "p2"] },
      },
    });
    const { result } = renderHook(() => useCapability("forecaster"));
    expect(result.current.isPending).toBe(false);
    expect(result.current.shouldShowTooltip).toBe(true);
    expect(result.current.shouldRequestCredentials).toBe(false);
  });

  test("Should request credentials when credentials return a 404 (no data)", () => {
    mockHooks({ credentials: null, capabilities: null });
    const { result } = renderHook(() => useCapability("forecaster"));
    expect(result.current.isPending).toBe(false);
    expect(result.current.shouldShowTooltip).toBe(false);
    expect(result.current.shouldRequestCredentials).toBe(true);
  });

  test("Should not show anything when credentials are valid and privileges are enough", () => {
    mockHooks({
      credentials: validCredentials,
      capabilities: {
        collector: { enabled: true },
        inspector: { enabled: true },
        forecaster: { enabled: true },
      },
    });
    const { result } = renderHook(() => useCapability("forecaster"));
    expect(result.current.isPending).toBe(false);
    expect(result.current.shouldShowTooltip).toBe(false);
    expect(result.current.shouldRequestCredentials).toBe(false);
  });
});

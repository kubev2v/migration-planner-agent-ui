import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { agentApiSlice } from "./agentApiSlice";
import { comparisonEndpoints } from "./comparisonEndpoints";
import { lifecycleEndpoints } from "./lifecycleEndpoints";

/**
 * The lifecycle mutations replace the former `AgentStatusContext` refetch and
 * the `ReportsContext` pub/sub bus: instead of callbacks re-syncing state, each
 * mutation invalidates a shared tag and every dependent query refetches from the
 * single cache. These tests lock that wiring.
 */

// Mirrors `REPORT_COMPLETED_TAGS` in `common/report/ReportsContext.tsx`. A
// completed collection run dispatches exactly this union.
const REPORT_COMPLETED_TAGS = [
  "AgentStatus",
  "Collections",
  "Inventory",
  "Vms",
  "VmLabels",
  "Group",
  "GroupVms",
  "GroupInventory",
] as const;

function makeFakeApi(): AgentApiClient {
  return {
    getAgentStatus: vi.fn(async () => ({
      mode: "connected",
      consoleConnection: { status: "connected" },
      rvtoolsModeEnabled: false,
    })),
    setAgentMode: vi.fn(async () => ({
      mode: "connected",
      consoleConnection: { status: "connected" },
      rvtoolsModeEnabled: false,
    })),
    getInspectorStatus: vi.fn(async () => ({ state: "ready" })),
    startInspection: vi.fn(async () => ({ state: "running" })),
    stopInspection: vi.fn(async () => ({ state: "ready" })),
    listCollections: vi.fn(async () => ({
      collections: [{ id: "c1", createdAt: new Date("2026-01-01T00:00:00Z") }],
    })),
  } as unknown as AgentApiClient;
}

describe("lifecycleEndpoints tag invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("setAgentMode invalidates AgentStatus so getAgentStatus refetches", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      lifecycleEndpoints.endpoints.getAgentStatus.initiate(),
    );
    expect(api.getAgentStatus).toHaveBeenCalledTimes(1);

    await store.dispatch(
      lifecycleEndpoints.endpoints.setAgentMode.initiate({ mode: "connected" }),
    );

    await vi.waitFor(() => {
      expect(api.getAgentStatus).toHaveBeenCalledTimes(2);
    });
  });

  test("startInspection invalidates InspectorStatus so getInspectorStatus refetches", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      lifecycleEndpoints.endpoints.getInspectorStatus.initiate(undefined),
    );
    expect(api.getInspectorStatus).toHaveBeenCalledTimes(1);

    await store.dispatch(
      lifecycleEndpoints.endpoints.startInspection.initiate({ vmIds: ["v1"] }),
    );

    await vi.waitFor(() => {
      expect(api.getInspectorStatus).toHaveBeenCalledTimes(2);
    });
  });

  test("report-completion tags refetch agent status and collections together", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      lifecycleEndpoints.endpoints.getAgentStatus.initiate(),
    );
    await store.dispatch(
      comparisonEndpoints.endpoints.listCollections.initiate(),
    );

    expect(api.getAgentStatus).toHaveBeenCalledTimes(1);
    expect(api.listCollections).toHaveBeenCalledTimes(1);

    // A completed report dispatches the union of tags (see ReportsContext).
    store.dispatch(
      agentApiSlice.util.invalidateTags([...REPORT_COMPLETED_TAGS]),
    );

    await vi.waitFor(() => {
      expect(api.getAgentStatus).toHaveBeenCalledTimes(2);
      expect(api.listCollections).toHaveBeenCalledTimes(2);
    });
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
import { collectionSucceeded } from "../slices/collectionLifecycleSlice";
import { comparisonEndpoints } from "./comparisonEndpoints";
import { lifecycleEndpoints } from "./lifecycleEndpoints";

/**
 * The lifecycle mutations replace the former `AgentStatusContext` refetch and
 * the former `ReportsContext` pub/sub bus: instead of callbacks re-syncing state,
 * each mutation invalidates a shared tag and every dependent query refetches from
 * the single cache. These tests lock that wiring.
 */

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
    // Not in progress, so the `appInitialized` resume listener is a no-op.
    getCollectorStatus: vi.fn(async () => ({ status: "ready" })),
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

  test("collectionSucceeded refetches collections but leaves agent status alone", async () => {
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

    // A completed collection is now owned by the VMs-side invalidation listener
    // (see `store/listeners/vmsInvalidationListeners.ts`), which invalidates only
    // Vms / VmLabels / Inventory / Collections — deliberately NOT AgentStatus.
    store.dispatch(collectionSucceeded());

    await vi.waitFor(() => {
      expect(api.listCollections).toHaveBeenCalledTimes(2);
    });
    // AgentStatus is not part of the completion tag set anymore.
    expect(api.getAgentStatus).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { createStore } from "../index";
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
    getCollectorStatus: vi.fn(async () => ({ status: "ready" })),
    startCollector: vi.fn(async () => ({ status: "running" })),
    listCollections: vi.fn(async () => ({
      collections: [{ id: "c1", createdAt: new Date("2026-01-01T00:00:00Z") }],
    })),
  } as unknown as AgentApiClient;
}

describe("lifecycleEndpoints tag invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("startCollector invalidates CollectorStatus so getCollectorStatus refetches", async () => {
    const api = makeFakeApi();
    const store = createStore(api);

    await store.dispatch(
      lifecycleEndpoints.endpoints.getCollectorStatus.initiate(),
    );
    expect(api.getCollectorStatus).toHaveBeenCalledTimes(1);

    await store.dispatch(
      lifecycleEndpoints.endpoints.startCollector.initiate(),
    );

    await vi.waitFor(() => {
      expect(api.getCollectorStatus).toHaveBeenCalledTimes(2);
    });
  });
});

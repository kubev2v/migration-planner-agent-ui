import { describe, expect, test, vi } from "vitest";
import type { AgentApiClient } from "../../api/agentApi";
import { getForecasterStatus } from "../../pages/StorageOffloadEstimator/utils/forecasterApi";
import type { ForecasterStatus } from "../../pages/StorageOffloadEstimator/utils/forecasterTypes";
import { createStore } from "../index";
import { agentApiSlice } from "./agentApiSlice";
import { forecasterEndpoints } from "./forecasterEndpoints";

vi.mock("../../pages/StorageOffloadEstimator/utils/forecasterApi", () => ({
  getForecasterStatus: vi.fn(),
}));

describe("forecasterEndpoints", () => {
  test("getForecasterStatus reads service state and refetches on Forecaster invalidation", async () => {
    // A mutable status the fake forecaster returns, so a benchmark finishing
    // (running -> ready) is observable after a single tag invalidation.
    const status: { current: ForecasterStatus } = {
      current: { state: "running", pairs: [] },
    };
    vi.mocked(getForecasterStatus).mockImplementation(
      async () => status.current,
    );

    const store = createStore({} as unknown as AgentApiClient);

    await store.dispatch(
      forecasterEndpoints.endpoints.getForecasterStatus.initiate(undefined),
    );

    const selectState = () =>
      forecasterEndpoints.endpoints.getForecasterStatus.select(undefined)(
        store.getState(),
      ).data?.state;

    expect(selectState()).toBe("running");
    expect(getForecasterStatus).toHaveBeenCalledTimes(1);

    // The benchmark completes; invalidating the shared tag refetches the query.
    status.current = { state: "ready" };
    store.dispatch(agentApiSlice.util.invalidateTags(["Forecaster"]));

    await vi.waitFor(() => {
      expect(selectState()).toBe("ready");
    });
    expect(getForecasterStatus).toHaveBeenCalledTimes(2);
  });
});

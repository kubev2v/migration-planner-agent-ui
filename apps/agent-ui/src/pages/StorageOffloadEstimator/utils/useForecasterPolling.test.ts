import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentApiClient } from "../../../api/agentApi";
import { createStore } from "../../../store";
import { getForecasterStatus } from "./forecasterApi";
import { useForecasterPolling } from "./useForecasterPolling";

vi.mock("./forecasterApi", () => ({
  getForecasterStatus: vi.fn(),
}));

/** Render the hook inside a fresh store so its RTK Query polling has a Provider. */
function renderPollingHook(
  options: Parameters<typeof useForecasterPolling>[0],
) {
  const store = createStore({} as unknown as AgentApiClient);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store, children });
  return renderHook(() => useForecasterPolling(options), { wrapper });
}

describe("useForecasterPolling", () => {
  beforeEach(() => {
    vi.mocked(getForecasterStatus).mockReset();
  });

  it("exposes polling state while a benchmark is starting", () => {
    const { result } = renderPollingHook({
      onStatusUpdate: vi.fn(),
      onBenchmarkComplete: vi.fn(),
    });

    expect(result.current.isPollingActive).toBe(false);

    act(() => {
      result.current.markBenchmarkStarting(["pair-a"]);
    });

    expect(result.current.isPollingActive).toBe(true);
  });

  it("exposes polling state while polling is active", () => {
    vi.mocked(getForecasterStatus).mockResolvedValue({
      state: "running",
      pairs: [],
    });

    const { result } = renderPollingHook({
      onStatusUpdate: vi.fn(),
      onBenchmarkComplete: vi.fn(),
    });

    act(() => {
      result.current.finishBenchmarkStart();
    });

    expect(result.current.isPollingActive).toBe(true);
  });

  it("clears polling state when polling stops", () => {
    vi.mocked(getForecasterStatus).mockResolvedValue({
      state: "running",
      pairs: [],
    });

    const { result } = renderPollingHook({
      onStatusUpdate: vi.fn(),
      onBenchmarkComplete: vi.fn(),
    });

    act(() => {
      result.current.finishBenchmarkStart();
    });

    expect(result.current.isPollingActive).toBe(true);

    act(() => {
      result.current.stopPolling();
    });

    expect(result.current.isPollingActive).toBe(false);
  });

  it("calls onBenchmarkComplete when polling observes a ready state", async () => {
    vi.mocked(getForecasterStatus)
      .mockResolvedValueOnce({
        state: "running",
        pairs: [],
      })
      .mockResolvedValue({
        state: "ready",
        pairs: [],
      });

    const onBenchmarkComplete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderPollingHook({
      onStatusUpdate: vi.fn(),
      onBenchmarkComplete,
    });

    act(() => {
      result.current.finishBenchmarkStart();
    });

    await waitFor(
      () => {
        expect(onBenchmarkComplete).toHaveBeenCalledWith([]);
      },
      { timeout: 3_000 },
    );
  });
});

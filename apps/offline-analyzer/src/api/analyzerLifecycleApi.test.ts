import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAnalyzerStatusAsAgentStatus } from "./analyzerLifecycleApi";

describe("fetchAnalyzerStatusAsAgentStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps GET /status ready to AgentStatus", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ status: "ready" }),
      })),
    );

    const agentStatus = await fetchAnalyzerStatusAsAgentStatus(
      "http://localhost/api/v1",
    );

    expect(agentStatus.mode).toBe("connected");
    expect(agentStatus.rvtoolsModeEnabled).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost/api/v1/status",
      { cache: "no-store" },
    );
  });
});

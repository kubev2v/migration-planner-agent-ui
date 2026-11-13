import { afterEach, describe, expect, it, vi } from "vitest";

import { calculateMigrationEstimation } from "./migrationEstimationApi";

describe("calculateMigrationEstimation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /migration-estimation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ estimation: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await calculateMigrationEstimation("https://example.test/api/v1", {
      filterExpression: "cluster_id = 'c1'",
      estimationSchema: ["network-based"],
      params: { transfer_rate_mbps: 620 },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api/v1/migration-estimation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          filterExpression: "cluster_id = 'c1'",
          estimationSchema: ["network-based"],
          params: { transfer_rate_mbps: 620 },
        }),
      }),
    );
  });
});

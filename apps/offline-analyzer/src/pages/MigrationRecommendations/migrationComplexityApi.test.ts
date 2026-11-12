import { afterEach, describe, expect, it, vi } from "vitest";

import { calculateMigrationComplexity } from "./migrationComplexityApi";

describe("calculateMigrationComplexity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs filterExpression to /complexity-estimation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        complexityByDisk: [],
        complexityByOSName: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await calculateMigrationComplexity(
      "https://example.test/api/v1",
      "cluster_id = 'c1'",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api/v1/complexity-estimation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ filterExpression: "cluster_id = 'c1'" }),
      }),
    );
  });

  it("surfaces server error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: "no collections found" }),
      }),
    );

    await expect(
      calculateMigrationComplexity("https://example.test/api/v1"),
    ).rejects.toThrow("no collections found");
  });
});

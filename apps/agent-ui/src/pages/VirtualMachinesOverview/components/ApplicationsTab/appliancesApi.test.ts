import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentApiClient } from "../../../../api/agentApi";
import { listCollectionAppliances, listGroupAppliances } from "./appliancesApi";

const agentApi = {
  configuration: { basePath: "http://localhost/agent/api/v2" },
} as AgentApiClient;

describe("appliancesApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads collection appliances from GET /collections/{id}/appliances", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        appliances: [
          {
            name: "F5 BIG-IP",
            vendor: "F5",
            version: "16.1",
            confidence: 75,
            vmCount: 1,
            vms: [{ id: "vm-1", name: "lb-01" }],
          },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const appliances = await listCollectionAppliances(agentApi, "col-1");
    expect(appliances).toHaveLength(1);
    expect(appliances[0]?.name).toBe("F5 BIG-IP");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/agent/api/v2/collections/col-1/appliances",
      { cache: "no-store" },
    );
  });

  it("loads group appliances from GET /groups/{id}/appliances", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ appliances: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await listGroupAppliances(agentApi, "group-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/agent/api/v2/groups/group-1/appliances",
      { cache: "no-store" },
    );
  });
});

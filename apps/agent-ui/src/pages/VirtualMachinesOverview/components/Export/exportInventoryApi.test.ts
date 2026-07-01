import { describe, expect, it, vi } from "vitest";
import { fetchExportInventory } from "./exportInventoryApi";

describe("fetchExportInventory", () => {
  it("requests export with selected scopes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["zip"])),
    });
    vi.stubGlobal("fetch", fetchMock);

    const agentApi = {
      configuration: { basePath: "http://127.0.0.1:3001/agent/api/v1" },
    } as never;

    await fetchExportInventory(agentApi, ["overview", "hosts"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/agent/api/v1/export?scope=overview%2Chosts",
      { cache: "no-store" },
    );
  });
});

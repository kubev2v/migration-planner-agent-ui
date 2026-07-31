import { describe, expect, it, vi } from "vitest";
import {
  detectExportFormatFromContentType,
  fetchExportInventory,
} from "./exportInventoryApi";

function mockExportRawResponse({
  contentType,
  body = "payload",
}: {
  contentType?: string | null;
  body?: string;
}) {
  const blob = new Blob([body]);
  return {
    raw: {
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? (contentType ?? null) : null,
      },
    },
    value: () => Promise.resolve(blob),
  };
}

describe("detectExportFormatFromContentType", () => {
  it("detects ZIP content types", () => {
    expect(detectExportFormatFromContentType("application/zip")).toBe("zip");
    expect(
      detectExportFormatFromContentType("application/x-zip-compressed"),
    ).toBe("zip");
    expect(
      detectExportFormatFromContentType("application/zip; charset=utf-8"),
    ).toBe("zip");
  });

  it("returns null for unknown or missing content types", () => {
    expect(detectExportFormatFromContentType(null)).toBeNull();
    expect(
      detectExportFormatFromContentType("application/octet-stream"),
    ).toBeNull();
  });
});

describe("fetchExportInventory", () => {
  it("requests export with selected scopes and no-store cache", async () => {
    const exportCollectionRaw = vi
      .fn()
      .mockResolvedValue(
        mockExportRawResponse({ contentType: "application/zip" }),
      );
    const listCollections = vi.fn().mockResolvedValue({
      collections: [{ id: "col-1", name: "latest", createdAt: new Date() }],
    });
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await fetchExportInventory(agentApi, ["overview", "hosts"], "zip");

    expect(exportCollectionRaw).toHaveBeenCalledWith(
      {
        id: "col-1",
        scope: "overview,hosts",
      },
      { cache: "no-store" },
    );
  });

  it("allows ZIP download when Content-Type is unrecognized", async () => {
    const exportCollectionRaw = vi
      .fn()
      .mockResolvedValue(
        mockExportRawResponse({ contentType: "application/octet-stream" }),
      );
    const listCollections = vi.fn().mockResolvedValue({
      collections: [{ id: "col-1", name: "latest", createdAt: new Date() }],
    });
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "zip"),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("surfaces API error messages from ResponseError", async () => {
    const { ResponseError } = await import(
      "@openshift-migration-advisor/agent-sdk"
    );
    const response = new Response(JSON.stringify({ error: "invalid scope" }), {
      status: 400,
    });
    const exportCollectionRaw = vi
      .fn()
      .mockRejectedValue(new ResponseError(response, "Bad Request"));
    const listCollections = vi.fn().mockResolvedValue({
      collections: [{ id: "col-1", name: "latest", createdAt: new Date() }],
    });
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "zip"),
    ).rejects.toThrow("invalid scope");
  });
});

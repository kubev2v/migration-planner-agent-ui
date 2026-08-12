import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
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

function mockListCollections() {
  return vi.fn().mockResolvedValue({
    collections: [{ id: "col-1", name: "latest", createdAt: new Date() }],
  });
}

describe("detectExportFormatFromContentType", () => {
  it("detects Excel and ZIP content types", () => {
    expect(
      detectExportFormatFromContentType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("xlsx");
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
  it("requests export with selected scopes, format, and no-store cache", async () => {
    const exportCollectionRaw = vi
      .fn()
      .mockResolvedValue(
        mockExportRawResponse({ contentType: "application/zip" }),
      );
    const listCollections = mockListCollections();
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await fetchExportInventory(agentApi, ["overview", "hosts"], "zip");

    expect(exportCollectionRaw).toHaveBeenCalledWith(
      {
        id: "col-1",
        scope: "overview,hosts",
        format: "zip",
      },
      { cache: "no-store" },
    );
  });

  it("requests Excel export when format is xlsx", async () => {
    const exportCollectionRaw = vi.fn().mockResolvedValue(
      mockExportRawResponse({
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const listCollections = mockListCollections();
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await fetchExportInventory(agentApi, ["overview"], "xlsx");

    expect(exportCollectionRaw).toHaveBeenCalledWith(
      {
        id: "col-1",
        scope: "overview",
        format: "xlsx",
      },
      { cache: "no-store" },
    );
  });

  it("rejects Excel requests when the agent returns a ZIP body", async () => {
    const exportCollectionRaw = vi
      .fn()
      .mockResolvedValue(
        mockExportRawResponse({ contentType: "application/zip" }),
      );
    const listCollections = mockListCollections();
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "xlsx"),
    ).rejects.toThrow(
      "Excel export is not supported by this agent. Choose ZIP (CSV files), or upgrade the agent.",
    );
  });

  it("rejects Excel requests when Content-Type is unrecognized", async () => {
    const exportCollectionRaw = vi
      .fn()
      .mockResolvedValue(
        mockExportRawResponse({ contentType: "application/octet-stream" }),
      );
    const listCollections = mockListCollections();
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "xlsx"),
    ).rejects.toThrow(
      "Could not verify Excel export response. Choose ZIP (CSV files), or try again.",
    );
  });

  it("allows ZIP download when Content-Type is unrecognized", async () => {
    const exportCollectionRaw = vi
      .fn()
      .mockResolvedValue(
        mockExportRawResponse({ contentType: "application/octet-stream" }),
      );
    const listCollections = mockListCollections();
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "zip"),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("surfaces API error messages from ResponseError", async () => {
    const response = new Response(JSON.stringify({ error: "invalid scope" }), {
      status: 400,
    });
    const exportCollectionRaw = vi
      .fn()
      .mockRejectedValue(new ResponseError(response, "Bad Request"));
    const listCollections = mockListCollections();
    const agentApi = { exportCollectionRaw, listCollections } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "zip"),
    ).rejects.toThrow("invalid scope");
  });
});

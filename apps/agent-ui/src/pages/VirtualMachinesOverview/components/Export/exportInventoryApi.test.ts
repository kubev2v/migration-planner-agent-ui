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
  it("requests export with selected scopes and format via the SDK", async () => {
    const exportInventoryRaw = vi.fn().mockResolvedValue(
      mockExportRawResponse({ contentType: "application/zip" }),
    );
    const agentApi = { exportInventoryRaw } as never;

    await fetchExportInventory(agentApi, ["overview", "hosts"], "zip");

    expect(exportInventoryRaw).toHaveBeenCalledWith({
      scope: "overview,hosts",
      format: "zip",
    });
  });

  it("requests Excel export when format is xlsx", async () => {
    const exportInventoryRaw = vi.fn().mockResolvedValue(
      mockExportRawResponse({
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const agentApi = { exportInventoryRaw } as never;

    await fetchExportInventory(agentApi, ["overview"], "xlsx");

    expect(exportInventoryRaw).toHaveBeenCalledWith({
      scope: "overview",
      format: "xlsx",
    });
  });

  it("rejects Excel requests when the agent returns a ZIP body", async () => {
    const exportInventoryRaw = vi.fn().mockResolvedValue(
      mockExportRawResponse({ contentType: "application/zip" }),
    );
    const agentApi = { exportInventoryRaw } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "xlsx"),
    ).rejects.toThrow(
      "Excel export is not supported by this agent. Choose ZIP (CSV files), or upgrade the agent.",
    );
  });

  it("allows the download when Content-Type is unrecognized", async () => {
    const exportInventoryRaw = vi.fn().mockResolvedValue(
      mockExportRawResponse({ contentType: "application/octet-stream" }),
    );
    const agentApi = { exportInventoryRaw } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "xlsx"),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("surfaces API error messages from ResponseError", async () => {
    const response = new Response(JSON.stringify({ error: "invalid scope" }), {
      status: 400,
    });
    const exportInventoryRaw = vi
      .fn()
      .mockRejectedValue(new ResponseError(response, "Bad Request"));
    const agentApi = { exportInventoryRaw } as never;

    await expect(
      fetchExportInventory(agentApi, ["overview"], "zip"),
    ).rejects.toThrow("invalid scope");
  });
});

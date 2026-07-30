import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExportInventory } from "./useExportInventory";

const downloadExportBlob = vi.fn();
const getExportFilename = vi.fn((format: "zip" | "xlsx") =>
  format === "xlsx"
    ? "migration-export-2026-07-01.xlsx"
    : "migration-export-2026-07-01.zip",
);
const fetchExportInventory = vi.fn();

vi.mock("./downloadExportBlob", () => ({
  downloadExportBlob: (...args: unknown[]) => downloadExportBlob(...args),
  getExportFilename: (...args: unknown[]) =>
    getExportFilename(...(args as ["zip" | "xlsx"])),
}));

vi.mock("./exportInventoryApi", () => ({
  fetchExportInventory: (...args: unknown[]) => fetchExportInventory(...args),
}));

describe("useExportInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchExportInventory.mockResolvedValue(new Blob(["export"]));
  });

  it("downloads an Excel file when format is xlsx", async () => {
    const agentApi = {} as never;
    const { result } = renderHook(() => useExportInventory(agentApi));

    await act(async () => {
      await result.current.confirmExport(["overview", "hosts"], "xlsx");
    });

    expect(fetchExportInventory).toHaveBeenCalledWith(
      agentApi,
      ["overview", "hosts"],
      "xlsx",
    );
    expect(getExportFilename).toHaveBeenCalledWith("xlsx");
    expect(downloadExportBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "migration-export-2026-07-01.xlsx",
    );
    expect(result.current.isExportModalOpen).toBe(false);
  });

  it("downloads a ZIP file when format is zip", async () => {
    const agentApi = {} as never;
    const { result } = renderHook(() => useExportInventory(agentApi));

    await act(async () => {
      await result.current.confirmExport(["overview"], "zip");
    });

    expect(fetchExportInventory).toHaveBeenCalledWith(
      agentApi,
      ["overview"],
      "zip",
    );
    expect(getExportFilename).toHaveBeenCalledWith("zip");
    expect(downloadExportBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "migration-export-2026-07-01.zip",
    );
  });

  it("keeps the modal open and surfaces errors when export fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    fetchExportInventory.mockRejectedValue(new Error("export failed"));
    const agentApi = {} as never;
    const { result } = renderHook(() => useExportInventory(agentApi));

    act(() => {
      result.current.openExportModal();
    });

    await act(async () => {
      await result.current.confirmExport(["overview"], "xlsx");
    });

    expect(result.current.isExportModalOpen).toBe(true);
    expect(result.current.exportError).toBe("export failed");
    expect(downloadExportBlob).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

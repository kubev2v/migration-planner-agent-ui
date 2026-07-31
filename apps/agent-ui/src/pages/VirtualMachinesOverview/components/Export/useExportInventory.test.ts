import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExportInventory } from "./useExportInventory";

const downloadExportBlob = vi.fn();
const getExportFilename = vi.fn((_format?: "zip", _date?: Date) => {
  return "migration-export-2026-07-01.zip";
});
const fetchExportInventory = vi.fn();

vi.mock("./downloadExportBlob", () => ({
  downloadExportBlob: (...args: unknown[]) => downloadExportBlob(...args),
  getExportFilename: (format?: "zip", date?: Date) =>
    getExportFilename(format, date),
}));

vi.mock("./exportInventoryApi", () => ({
  fetchExportInventory: (...args: unknown[]) => fetchExportInventory(...args),
}));

describe("useExportInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchExportInventory.mockResolvedValue(new Blob(["export"]));
  });

  it("downloads a ZIP file when format is zip", async () => {
    const agentApi = {} as never;
    const { result } = renderHook(() =>
      useExportInventory(agentApi, {
        hasCollectionData: true,
        hasInventory: true,
      }),
    );

    await act(async () => {
      await result.current.confirmExport(["overview"], "zip");
    });

    expect(fetchExportInventory).toHaveBeenCalledWith(
      agentApi,
      ["overview"],
      "zip",
    );
    expect(getExportFilename).toHaveBeenCalledWith("zip", undefined);
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
    const { result } = renderHook(() =>
      useExportInventory(agentApi, {
        hasCollectionData: true,
        hasInventory: true,
      }),
    );

    act(() => {
      result.current.openExportModal();
    });

    await act(async () => {
      await result.current.confirmExport(["overview"], "zip");
    });

    expect(result.current.isExportModalOpen).toBe(true);
    expect(result.current.exportError).toBe("export failed");
    expect(downloadExportBlob).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

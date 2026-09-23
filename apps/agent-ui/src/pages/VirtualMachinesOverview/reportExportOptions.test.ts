import { describe, expect, it, vi } from "vitest";
import { buildOverviewExportOptions } from "./reportExportOptions";

describe("buildOverviewExportOptions", () => {
  it("includes PDF, HTML, PNG, and Spreadsheet when all handlers exist", () => {
    expect(
      buildOverviewExportOptions({
        onExportPdf: vi.fn(),
        onExportHtml: vi.fn(),
        onExportPng: vi.fn(),
        onExportInventory: vi.fn(),
      }).map((option) => option.key),
    ).toEqual(["pdf", "html", "png", "inventory"]);
  });

  it("omits HTML on a cluster view and still keeps inventory", () => {
    expect(
      buildOverviewExportOptions({
        onExportPdf: vi.fn(),
        onExportPng: vi.fn(),
        onExportInventory: vi.fn(),
      }).map((option) => option.key),
    ).toEqual(["pdf", "png", "inventory"]);
  });

  it("calls the selected format handler", () => {
    const onExportPdf = vi.fn();
    const onExportInventory = vi.fn();
    const options = buildOverviewExportOptions({
      onExportPdf,
      onExportInventory,
    });

    options.find((option) => option.key === "pdf")?.onSelect();
    options.find((option) => option.key === "inventory")?.onSelect();

    expect(onExportPdf).toHaveBeenCalledTimes(1);
    expect(onExportInventory).toHaveBeenCalledTimes(1);
  });
});

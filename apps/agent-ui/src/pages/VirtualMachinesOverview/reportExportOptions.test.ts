import { describe, expect, it, vi } from "vitest";
import { buildOverviewExportOptions } from "./reportExportOptions";

describe("buildOverviewExportOptions", () => {
  it("adds PDF, HTML, PNG, and spreadsheet actions", () => {
    const onExportPdf = vi.fn();
    const onExportPng = vi.fn();
    const onExportHtml = vi.fn();
    const onExportInventory = vi.fn();

    expect(
      buildOverviewExportOptions({
        onExportPdf,
        onExportPng,
        onExportHtml,
        onExportInventory,
      }).map((option) => option.key),
    ).toEqual(["pdf", "html", "png", "inventory"]);
  });
});

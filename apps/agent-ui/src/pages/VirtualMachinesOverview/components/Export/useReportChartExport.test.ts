import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CapturedChart, ExportChartSpec } from "./captureExportCharts";
import { useReportChartExport } from "./useReportChartExport";

const specs: ExportChartSpec[] = [
  {
    id: "infra",
    title: "Infrastructure summary",
    filename: "01-infra.png",
    node: null,
  },
];

const captured: CapturedChart[] = [
  {
    id: "infra",
    title: "Infrastructure summary",
    filename: "01-infra.png",
    canvas: document.createElement("canvas"),
  },
];

describe("useReportChartExport", () => {
  const packagers = {
    pdf: vi.fn().mockResolvedValue(undefined),
    png: vi.fn().mockResolvedValue(undefined),
    html: vi.fn().mockResolvedValue(undefined),
    singlePng: vi.fn().mockResolvedValue(undefined),
  };
  const captureCharts = vi.fn().mockResolvedValue(captured);

  beforeEach(() => {
    vi.clearAllMocks();
    captureCharts.mockResolvedValue(captured);
  });

  it("captures each chart then packages PDF, PNG, and HTML", async () => {
    const { result } = renderHook(() =>
      useReportChartExport({
        packagers,
        captureCharts,
      }),
    );

    await act(async () => {
      await result.current.exportPdf("Assessment report", specs);
    });
    await act(async () => {
      await result.current.exportPng(specs);
    });
    await act(async () => {
      await result.current.exportHtml("Assessment report", specs);
    });

    expect(captureCharts).toHaveBeenCalledTimes(3);
    expect(packagers.pdf).toHaveBeenCalledWith(captured, "Assessment report");
    expect(packagers.png).toHaveBeenCalledWith(captured);
    expect(packagers.html).toHaveBeenCalledWith(captured, "Assessment report");
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();
  });

  it("surfaces an error when there are no charts to export", async () => {
    const { result } = renderHook(() =>
      useReportChartExport({
        packagers,
        captureCharts,
      }),
    );

    await act(async () => {
      await result.current.exportPdf("Assessment report", []);
    });

    expect(captureCharts).not.toHaveBeenCalled();
    expect(packagers.pdf).not.toHaveBeenCalled();
    expect(result.current.exportError).toBe(
      "The report is not ready to export yet.",
    );
  });

  it("keeps the loading label while a format is generating", async () => {
    let resolvePdf: (() => void) | undefined;
    packagers.pdf.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePdf = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useReportChartExport({
        packagers,
        captureCharts,
      }),
    );

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.exportPdf("Assessment report", specs);
    });

    expect(result.current.isExporting).toBe(true);
    expect(result.current.exportLoadingLabel).toBe("Generating PDF...");

    await act(async () => {
      resolvePdf?.();
      await pending;
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportLoadingLabel).toBeNull();
  });

  it("records exporter failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    packagers.png.mockRejectedValue(new Error("canvas failed"));

    const { result } = renderHook(() =>
      useReportChartExport({
        packagers,
        captureCharts,
      }),
    );

    await act(async () => {
      await result.current.exportPng(specs);
    });

    expect(result.current.exportError).toBe("canvas failed");
    consoleError.mockRestore();
  });

  it("downloads a single captured chart as PNG", async () => {
    const { result } = renderHook(() =>
      useReportChartExport({
        packagers,
        captureCharts,
      }),
    );

    await act(async () => {
      await result.current.exportSinglePng(specs[0]);
    });

    expect(captureCharts).toHaveBeenCalledWith([specs[0]]);
    expect(packagers.singlePng).toHaveBeenCalledWith(captured[0]);
    expect(packagers.png).not.toHaveBeenCalled();
    expect(result.current.downloadingChartId).toBeNull();
  });
});

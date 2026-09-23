import { useCallback, useRef, useState } from "react";
import type { ChartPrintHostHandle } from "./ChartPrintHost";
import type { CapturedChart, ExportChartSpec } from "./captureExportCharts";

export type ChartExportFormat = "pdf" | "png" | "html";

export type ChartPackagers = {
  pdf: (charts: CapturedChart[], documentTitle: string) => Promise<void>;
  png: (charts: CapturedChart[]) => Promise<void>;
  html: (charts: CapturedChart[], documentTitle: string) => Promise<void>;
  singlePng: (chart: CapturedChart) => Promise<void>;
};

const DEFAULT_PACKAGERS: ChartPackagers = {
  pdf: async (charts, documentTitle) => {
    const { generatePdfFromCharts } = await import("./pdfExport");
    await generatePdfFromCharts(charts, documentTitle);
  },
  png: async (charts) => {
    const { generatePngZipFromCharts } = await import("./pngExport");
    await generatePngZipFromCharts(charts);
  },
  html: async (charts, documentTitle) => {
    const { generateHtmlReportFromCharts } = await import("./htmlExport");
    await generateHtmlReportFromCharts(charts, documentTitle);
  },
  singlePng: async (chart) => {
    const { generatePngFromChart } = await import("./pngExport");
    await generatePngFromChart(chart);
  },
};

const LOADING_LABELS: Record<ChartExportFormat, string> = {
  pdf: "Generating PDF...",
  png: "Generating PNG...",
  html: "Generating HTML...",
};

type UseReportChartExportOptions = {
  packagers?: ChartPackagers;
  captureCharts?: (specs: ExportChartSpec[]) => Promise<CapturedChart[]>;
};

export function useReportChartExport({
  packagers = DEFAULT_PACKAGERS,
  captureCharts,
}: UseReportChartExportOptions = {}) {
  const printHostRef = useRef<ChartPrintHostHandle>(null);
  const isExportingRef = useRef(false);
  const [loadingFormat, setLoadingFormat] = useState<ChartExportFormat | null>(
    null,
  );
  const [downloadingChartId, setDownloadingChartId] = useState<string | null>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);

  const resolveCharts = useCallback(
    async (specs: ExportChartSpec[]) => {
      if (captureCharts) {
        return captureCharts(specs);
      }
      const { captureExportCharts } = await import("./captureExportCharts");
      const printHost = printHostRef.current;
      if (!printHost) {
        throw new Error("The report is not ready to export yet.");
      }
      return captureExportCharts(printHost, specs);
    },
    [captureCharts],
  );

  const runExport = useCallback(
    async (
      format: ChartExportFormat,
      specs: ExportChartSpec[],
      exportFn: (charts: CapturedChart[]) => Promise<void>,
    ) => {
      if (isExportingRef.current) {
        return;
      }

      if (specs.length === 0) {
        setExportError("The report is not ready to export yet.");
        return;
      }

      isExportingRef.current = true;
      setLoadingFormat(format);
      setExportError(null);

      try {
        await exportFn(await resolveCharts(specs));
      } catch (error) {
        console.error(`Error exporting ${format}:`, error);
        setExportError(
          error instanceof Error
            ? error.message
            : `Failed to export ${format.toUpperCase()}. Please try again.`,
        );
      } finally {
        isExportingRef.current = false;
        setLoadingFormat(null);
      }
    },
    [resolveCharts],
  );

  const exportPdf = useCallback(
    (documentTitle: string, specs: ExportChartSpec[]) =>
      runExport("pdf", specs, (charts) => packagers.pdf(charts, documentTitle)),
    [packagers, runExport],
  );

  const exportPng = useCallback(
    (specs: ExportChartSpec[]) =>
      runExport("png", specs, (charts) => packagers.png(charts)),
    [packagers, runExport],
  );

  const exportHtml = useCallback(
    (documentTitle: string, specs: ExportChartSpec[]) =>
      runExport("html", specs, (charts) =>
        packagers.html(charts, documentTitle),
      ),
    [packagers, runExport],
  );

  const exportSinglePng = useCallback(
    async (spec: ExportChartSpec) => {
      if (isExportingRef.current) {
        return;
      }

      isExportingRef.current = true;
      setDownloadingChartId(spec.id);
      setExportError(null);

      try {
        const charts = await resolveCharts([spec]);
        const chart = charts[0];
        if (!chart) {
          throw new Error("The report is not ready to export yet.");
        }
        await packagers.singlePng(chart);
      } catch (error) {
        console.error("Error exporting png:", error);
        setExportError(
          error instanceof Error
            ? error.message
            : "Failed to export PNG. Please try again.",
        );
      } finally {
        isExportingRef.current = false;
        setDownloadingChartId(null);
      }
    },
    [packagers, resolveCharts],
  );

  const clearExportError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    printHostRef,
    isExporting: loadingFormat !== null || downloadingChartId !== null,
    exportLoadingLabel: loadingFormat ? LOADING_LABELS[loadingFormat] : null,
    exportError,
    downloadingChartId,
    exportPdf,
    exportPng,
    exportHtml,
    exportSinglePng,
    clearExportError,
  };
}

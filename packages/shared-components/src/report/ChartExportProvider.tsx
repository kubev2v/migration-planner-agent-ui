import {
  type FC,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type ChartCaptureSource,
  type ChartExportFile,
  canvasToBlob,
  downloadBlob,
  type RegisteredChart,
  releaseCanvas,
  sortRegisteredChartsByDocumentOrder,
} from "./chartExport.js";
import {
  type ChartExportApi,
  ChartExportApiContext,
  type ChartExportFormat,
  type ChartExportRegistry,
  ChartExportRegistryContext,
} from "./chartExportContext.js";
import { getChartExportFilename } from "./chartExportFilenames.js";

export type CaptureChartElement = (
  element: HTMLElement,
) => Promise<HTMLCanvasElement>;
export type ZipChartFiles = (files: ChartExportFile[]) => Promise<Blob>;
export type EncodeChartPng = (canvas: HTMLCanvasElement) => Promise<Blob>;
export type BuildChartDocument = (
  charts: ChartCaptureSource[],
  documentTitle: string,
) => Promise<Blob>;

export type {
  ChartExportApi,
  ChartExportFormat,
} from "./chartExportContext.js";
export { useChartExport, useRegisterChart } from "./chartExportContext.js";

export interface ChartExportProviderProps {
  children: ReactNode;
  capture?: CaptureChartElement;
  zipFiles?: ZipChartFiles;
  encodePng?: EncodeChartPng;
  buildPdf?: BuildChartDocument;
  buildHtml?: BuildChartDocument;
  downloadFile?: (blob: Blob, filename: string) => void;
  getZipFilename?: () => string;
  getPdfFilename?: () => string;
  getHtmlFilename?: () => string;
}

const EXPORT_LOADING_LABELS: Record<ChartExportFormat, string> = {
  pdf: "Generating PDF...",
  png: "Generating PNG...",
  html: "Generating HTML...",
};

const defaultZipFilename = (): string => getChartExportFilename("zip");
const defaultPdfFilename = (): string => getChartExportFilename("pdf");
const defaultHtmlFilename = (): string => getChartExportFilename("html");

async function resolveCapture(
  override?: CaptureChartElement,
): Promise<CaptureChartElement> {
  if (override) {
    return override;
  }
  const { captureChartElement } = await import("./captureChartElement.js");
  return captureChartElement;
}

async function resolveZip(override?: ZipChartFiles): Promise<ZipChartFiles> {
  if (override) {
    return override;
  }
  const { zipChartPngs } = await import("./zipChartPngs.js");
  return zipChartPngs;
}

async function resolvePdf(
  override?: BuildChartDocument,
): Promise<BuildChartDocument> {
  if (override) {
    return override;
  }
  const { buildPdfFromCharts } = await import("./pdfExport.js");
  return buildPdfFromCharts;
}

async function resolveHtml(
  override?: BuildChartDocument,
): Promise<BuildChartDocument> {
  if (override) {
    return override;
  }
  const { buildHtmlFromCharts } = await import("./htmlExport.js");
  return buildHtmlFromCharts;
}

function toCaptureSources(
  charts: RegisteredChart[],
  capture: CaptureChartElement,
): ChartCaptureSource[] {
  return charts.map((chart) => ({
    id: chart.id,
    title: chart.title,
    filename: chart.filename,
    capture: () => capture(chart.element),
  }));
}

export const ChartExportProvider: FC<ChartExportProviderProps> = ({
  children,
  capture,
  zipFiles,
  encodePng = canvasToBlob,
  buildPdf,
  buildHtml,
  downloadFile = downloadBlob,
  getZipFilename = defaultZipFilename,
  getPdfFilename = defaultPdfFilename,
  getHtmlFilename = defaultHtmlFilename,
}) => {
  const chartsRef = useRef(new Map<string, RegisteredChart>());
  const isBusyRef = useRef(false);
  const [downloadingChartId, setDownloadingChartId] = useState<string | null>(
    null,
  );
  const [exportingFormat, setExportingFormat] =
    useState<ChartExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const registry = useMemo<ChartExportRegistry>(
    () => ({
      register(chart) {
        const existing = chartsRef.current.get(chart.id);
        if (
          existing &&
          existing.element !== chart.element &&
          existing.element.isConnected
        ) {
          console.warn(
            `Duplicate chart export id "${chart.id}". The previous chart will not be exported.`,
          );
        }
        chartsRef.current.set(chart.id, chart);
        return () => {
          const current = chartsRef.current.get(chart.id);
          if (current?.element === chart.element) {
            chartsRef.current.delete(chart.id);
          }
        };
      },
    }),
    [],
  );

  const listCharts = useCallback((): RegisteredChart[] => {
    return sortRegisteredChartsByDocumentOrder(
      Array.from(chartsRef.current.values()).filter(
        (chart) => chart.element.isConnected,
      ),
    );
  }, []);

  const runCapture = useCallback(
    async (
      work: () => Promise<void>,
      chartId: string | null,
      format: ChartExportFormat,
    ) => {
      if (isBusyRef.current) {
        return;
      }

      isBusyRef.current = true;
      setExportError(null);
      if (chartId) {
        setDownloadingChartId(chartId);
      } else {
        setExportingFormat(format);
      }

      try {
        await work();
      } catch (error) {
        console.error(`Error exporting ${format}:`, error);
        setExportError(
          `Failed to export ${format.toUpperCase()}. Please try again.`,
        );
      } finally {
        isBusyRef.current = false;
        setDownloadingChartId(null);
        setExportingFormat(null);
      }
    },
    [],
  );

  const downloadChart = useCallback(
    async (id: string) => {
      await runCapture(
        async () => {
          const chart = chartsRef.current.get(id);
          if (!chart?.element.isConnected) {
            throw new Error("The chart is not ready to export yet.");
          }
          const captureFn = await resolveCapture(capture);
          const canvas = await captureFn(chart.element);
          try {
            downloadFile(await encodePng(canvas), chart.filename);
          } finally {
            releaseCanvas(canvas);
          }
        },
        id,
        "png",
      );
    },
    [capture, downloadFile, encodePng, runCapture],
  );

  const downloadAll = useCallback(async () => {
    await runCapture(
      async () => {
        const charts = listCharts();
        if (charts.length === 0) {
          throw new Error("The report is not ready to export yet.");
        }
        const captureFn = await resolveCapture(capture);
        const zipFn = await resolveZip(zipFiles);
        const files: ChartExportFile[] = [];
        for (const [index, chart] of charts.entries()) {
          const canvas = await captureFn(chart.element);
          try {
            files.push({
              filename: `${String(index + 1).padStart(2, "0")}-${chart.filename}`,
              blob: await encodePng(canvas),
            });
          } finally {
            releaseCanvas(canvas);
          }
        }
        downloadFile(await zipFn(files), getZipFilename());
      },
      null,
      "png",
    );
  }, [
    capture,
    downloadFile,
    encodePng,
    getZipFilename,
    listCharts,
    runCapture,
    zipFiles,
  ]);

  const downloadPdf = useCallback(
    async (documentTitle: string) => {
      await runCapture(
        async () => {
          const charts = listCharts();
          if (charts.length === 0) {
            throw new Error("The report is not ready to export yet.");
          }
          const captureFn = await resolveCapture(capture);
          const build = await resolvePdf(buildPdf);
          downloadFile(
            await build(toCaptureSources(charts, captureFn), documentTitle),
            getPdfFilename(),
          );
        },
        null,
        "pdf",
      );
    },
    [buildPdf, capture, downloadFile, getPdfFilename, listCharts, runCapture],
  );

  const downloadHtml = useCallback(
    async (documentTitle: string) => {
      await runCapture(
        async () => {
          const charts = listCharts();
          if (charts.length === 0) {
            throw new Error("The report is not ready to export yet.");
          }
          const captureFn = await resolveCapture(capture);
          const build = await resolveHtml(buildHtml);
          downloadFile(
            await build(toCaptureSources(charts, captureFn), documentTitle),
            getHtmlFilename(),
          );
        },
        null,
        "html",
      );
    },
    [buildHtml, capture, downloadFile, getHtmlFilename, listCharts, runCapture],
  );

  const clearExportError = useCallback(() => {
    setExportError(null);
  }, []);

  const api = useMemo<ChartExportApi>(
    () => ({
      downloadChart,
      downloadAll,
      downloadPdf,
      downloadHtml,
      downloadingChartId,
      exportingFormat,
      exportLoadingLabel: exportingFormat
        ? EXPORT_LOADING_LABELS[exportingFormat]
        : null,
      isExportingAll: exportingFormat !== null,
      isBusy: downloadingChartId !== null || exportingFormat !== null,
      exportError,
      clearExportError,
    }),
    [
      clearExportError,
      downloadAll,
      downloadChart,
      downloadHtml,
      downloadPdf,
      downloadingChartId,
      exportError,
      exportingFormat,
    ],
  );

  return (
    <ChartExportRegistryContext.Provider value={registry}>
      <ChartExportApiContext.Provider value={api}>
        {children}
      </ChartExportApiContext.Provider>
    </ChartExportRegistryContext.Provider>
  );
};

ChartExportProvider.displayName = "ChartExportProvider";

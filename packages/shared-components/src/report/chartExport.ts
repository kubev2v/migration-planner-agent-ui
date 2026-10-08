import type { CSSProperties } from "react";

export const CHART_EXPORT_HIDE_ATTR = "data-chart-export-hide";
export const CHART_EXPORT_SCROLL_ATTR = "data-chart-export-scroll";
export const CHART_EXPORT_CAPTURING_ATTR = "data-chart-capturing";

export const chartExportHideProps = {
  [CHART_EXPORT_HIDE_ATTR]: "",
} as const;

export const chartExportScrollProps = {
  [CHART_EXPORT_SCROLL_ATTR]: "",
} as const;

export const chartExportRootStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

export type ChartExportMeta = {
  id: string;
  title: string;
  filename?: string;
};

export type ChartExportView = {
  id: string;
  title: string;
  filename?: string;
};

export type RegisteredChart = {
  id: string;
  title: string;
  filename: string;
  element: HTMLElement;
  exportViews?: ChartExportView[];
  activeExportViewId?: string;
  setExportView?: (viewId: string) => Promise<void>;
};

export type ChartExportFile = {
  filename: string;
  blob: Blob;
};

export type ChartCaptureSource = {
  id: string;
  title: string;
  filename: string;
  capture: () => Promise<HTMLCanvasElement>;
};

/** One label/value row rendered on a {@link PdfTextPage}. */
export type PdfTextPageItem = {
  label: string;
  value: string;
};

/**
 * A native-text PDF page appended after the captured chart images.
 *
 * Used for content that is not a chart/card (e.g. calculated recommendations)
 * but still needs to be part of the exported PDF.
 */
export type PdfTextPage = {
  title: string;
  items: PdfTextPageItem[];
  footer?: string;
};

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function waitForChartExportPaint(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** PatternFly applies dark tokens when this class is on `:root`. */
export const PATTERNFLY_DARK_THEME_CLASSES = [
  "pf-v6-theme-dark",
  "pf-v5-theme-dark",
] as const;

/**
 * Force PatternFly light tokens on a document (the html2canvas clone).
 * Does not touch the live page.
 */
export function applyLightThemeToDocument(root: Document): void {
  for (const node of [root.documentElement, root.body]) {
    if (!node) {
      continue;
    }
    for (const className of PATTERNFLY_DARK_THEME_CLASSES) {
      node.classList.remove(className);
    }
    node.style.colorScheme = "light";
  }
}

export function chartExportViewsFromLabels(
  titlePrefix: string,
  labels: Record<string, string>,
): ChartExportView[] {
  return Object.entries(labels).map(([id, label]) => ({
    id,
    title: `${titlePrefix} — ${label}`,
  }));
}

function shouldCycleExportViews(chart: RegisteredChart): boolean {
  return Boolean(
    chart.exportViews && chart.exportViews.length > 1 && chart.setExportView,
  );
}

function bulkExportViews(chart: RegisteredChart): ChartExportView[] {
  if (shouldCycleExportViews(chart) && chart.exportViews) {
    return chart.exportViews;
  }
  return [
    {
      id: chart.id,
      title: chart.title,
      filename: chart.filename,
    },
  ];
}

export function toBulkChartCaptureSources(
  charts: RegisteredChart[],
  capture: (element: HTMLElement) => Promise<HTMLCanvasElement>,
  prepareElement?: (element: HTMLElement) => () => void,
): ChartCaptureSource[] {
  return charts.flatMap((chart) => {
    const views = bulkExportViews(chart);
    const cyclesViews = shouldCycleExportViews(chart);
    return views.map((view) => ({
      id: cyclesViews ? `${chart.id}--${view.id}` : chart.id,
      title: view.title,
      filename:
        view.filename ??
        (cyclesViews
          ? chartPngFilename(view.title, `${chart.id}-${view.id}`)
          : chart.filename),
      capture: async () => {
        const restore = prepareElement?.(chart.element);
        try {
          if (cyclesViews && chart.setExportView) {
            await chart.setExportView(view.id);
          }
          return await capture(chart.element);
        } finally {
          restore?.();
        }
      },
    }));
  });
}

export async function restoreChartExportViews(
  charts: RegisteredChart[],
): Promise<void> {
  for (const chart of charts) {
    if (
      shouldCycleExportViews(chart) &&
      chart.setExportView &&
      chart.activeExportViewId
    ) {
      try {
        await chart.setExportView(chart.activeExportViewId);
      } catch (error) {
        console.error("Failed to restore the selected chart view:", error);
      }
    }
  }
}

export function sortRegisteredChartsByDocumentOrder(
  charts: RegisteredChart[],
): RegisteredChart[] {
  return [...charts].sort((left, right) => {
    if (left.element === right.element) {
      return 0;
    }
    const position = left.element.compareDocumentPosition(right.element);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas.width < 1 || canvas.height < 1) {
      reject(new Error("Failed to encode canvas as PNG"));
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Failed to encode canvas as PNG"));
    }, "image/png");
  });
}

export function slugifyExportName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "chart";
}

export function chartPngFilename(title: string, id = "chart"): string {
  return `${slugifyExportName(title) || slugifyExportName(id)}.png`;
}

const KEEP_TAGS = new Set(["HTML", "HEAD", "BODY", "STYLE", "LINK"]);

function isHiddenForChartExport(node: Element): boolean {
  return (
    node.hasAttribute(CHART_EXPORT_HIDE_ATTR) ||
    Boolean(node.closest(`[${CHART_EXPORT_HIDE_ATTR}]`))
  );
}

/**
 * html2canvas clones the whole document for every capture. Ignore everything
 * except the target card (and ancestors / stylesheet nodes) so zip-all does
 * not re-render every other chart.
 */
export function shouldIgnoreChartExportElement(
  node: Element,
  captureRoot?: Element | null,
): boolean {
  if (!captureRoot) {
    return isHiddenForChartExport(node);
  }
  if (KEEP_TAGS.has(node.tagName)) {
    return false;
  }
  if (
    node !== captureRoot &&
    !captureRoot.contains(node) &&
    !node.contains(captureRoot)
  ) {
    return true;
  }
  return isHiddenForChartExport(node);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

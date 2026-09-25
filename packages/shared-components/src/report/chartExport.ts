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

export const chartExportRootStyle: CSSProperties = { height: "100%" };

export type ChartExportMeta = {
  id: string;
  title: string;
  filename?: string;
};

export type RegisteredChart = {
  id: string;
  title: string;
  filename: string;
  element: HTMLElement;
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

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
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

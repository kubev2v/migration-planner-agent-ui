import html2canvas from "html2canvas-pro";
import { getDatedExportBasename } from "./downloadExportBlob";

export interface PdfExportSegment {
  top: number;
  height: number;
}

/** Print-width capture; ~150 DPI on A4, 4x fewer pixels than devicePixelRatio=2. */
export const CHART_CAPTURE_SCALE = 1;

const PRINT_HOST_ID = "chart-print-host";
const KEEP_TAGS = new Set(["HTML", "HEAD", "BODY", "STYLE", "LINK"]);

export function shouldIgnoreExportElement(
  node: Element,
  printHost: Element | null = document.getElementById(PRINT_HOST_ID),
): boolean {
  if (!printHost) {
    return false;
  }
  if (KEEP_TAGS.has(node.tagName)) {
    return false;
  }
  if (node === printHost || printHost.contains(node)) {
    return false;
  }
  return true;
}

export function getChartExportFilename(
  format: "pdf" | "html" | "zip",
  date = new Date(),
): string {
  const base = getDatedExportBasename(date);
  if (format === "zip") {
    return `${base}-charts.zip`;
  }
  return `${base}.${format}`;
}

export async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const finish = (): void => {
            img.removeEventListener("load", finish);
            img.removeEventListener("error", finish);
            resolve();
          };
          img.addEventListener("load", finish);
          img.addEventListener("error", finish);
        }),
    ),
  );
}

export function waitForAnimationFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number): void => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => {
        step(remaining - 1);
      });
    };
    step(count);
  });
}

export async function waitForChartsToPaint(
  container: HTMLElement,
  timeoutMs = 80,
): Promise<void> {
  await waitForAnimationFrames(2);
  const svg = container.querySelector("svg");
  if (!svg) {
    return;
  }

  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const { width, height } = svg.getBoundingClientRect();
    if (width > 0 && height > 0) {
      await waitForAnimationFrames(1);
      return;
    }
    await waitForAnimationFrames(1);
  }
}

export async function prepareExportContainer(
  container: HTMLElement,
): Promise<void> {
  await waitForImages(container);
  await waitForChartsToPaint(container);
}

export async function captureElementToCanvas(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  const backgroundColor =
    window.getComputedStyle(element).backgroundColor || "#ffffff";
  const printHost = document.getElementById(PRINT_HOST_ID);
  return html2canvas(element, {
    useCORS: true,
    backgroundColor,
    logging: false,
    scale: CHART_CAPTURE_SCALE,
    imageTimeout: 0,
    ignoreElements: (node) => shouldIgnoreExportElement(node, printHost),
  });
}

export function splitSegmentForPageHeight(
  segment: PdfExportSegment,
  imgHeight: number,
  pageHeightPx: number,
): PdfExportSegment[] {
  const total = Math.max(1, Math.min(segment.height, imgHeight - segment.top));
  if (pageHeightPx <= 0 || total <= pageHeightPx) {
    return [{ top: segment.top, height: total }];
  }

  const slices: PdfExportSegment[] = [];
  let offset = 0;
  while (offset < total) {
    const height = Math.min(pageHeightPx, total - offset);
    slices.push({ top: segment.top + offset, height });
    offset += height;
  }
  return slices;
}

export function slugifyExportName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "chart";
}

export function chartFilename(index: number, title: string): string {
  return `${String(index + 1).padStart(2, "0")}-${slugifyExportName(title)}.png`;
}

export function singleChartFilename(title: string): string {
  return `${slugifyExportName(title)}.png`;
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

export function sliceCanvas(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  offsetY: number,
  backgroundColor: string,
): HTMLCanvasElement {
  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = width;
  pageCanvas.height = height;
  const context = pageCanvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context unavailable");
  }
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);
  context.drawImage(
    sourceCanvas,
    0,
    offsetY,
    width,
    height,
    0,
    0,
    width,
    height,
  );
  return pageCanvas;
}

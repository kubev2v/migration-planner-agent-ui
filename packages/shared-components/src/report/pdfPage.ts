export interface PdfExportSegment {
  top: number;
  height: number;
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

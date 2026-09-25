import { type ChartCaptureSource, releaseCanvas } from "./chartExport.js";

export interface HtmlReportImage {
  name: string;
  dataUrl: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildHtmlReport(
  documentTitle: string,
  images: HtmlReportImage[],
  generatedAt = new Date(),
): string {
  const sections = images
    .map(
      (image) => `
    <section>
      <h2>${escapeHtml(image.name)}</h2>
      <img src="${image.dataUrl}" alt="${escapeHtml(image.name)}" />
    </section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    body {
      font-family: RedHatText, Helvetica, Arial, sans-serif;
      margin: 32px auto;
      max-width: 1100px;
      background: #fff;
      color: #151515;
    }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin: 32px 0 12px; }
    .meta { color: #6a6e73; margin-bottom: 24px; }
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid #d2d2d2;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(documentTitle)}</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt.toLocaleString())}</p>
  ${sections}
</body>
</html>
`;
}

export async function buildHtmlFromCharts(
  charts: ChartCaptureSource[],
  documentTitle: string,
): Promise<Blob> {
  const images: HtmlReportImage[] = [];
  for (const chart of charts) {
    const canvas = await chart.capture();
    try {
      images.push({
        name: chart.title,
        dataUrl: canvas.toDataURL("image/png"),
      });
    } finally {
      releaseCanvas(canvas);
    }
  }

  return new Blob([buildHtmlReport(documentTitle, images)], {
    type: "text/html;charset=utf-8",
  });
}

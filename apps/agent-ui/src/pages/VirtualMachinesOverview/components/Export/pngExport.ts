import JSZip from "jszip";
import type { CapturedChart } from "./captureExportCharts";
import { canvasToBlob, getChartExportFilename } from "./chartExportCapture";
import { downloadExportBlob } from "./downloadExportBlob";

export async function generatePngZipFromCharts(
  charts: CapturedChart[],
): Promise<void> {
  const zip = new JSZip();
  const files = await Promise.all(
    charts.map(async (chart) => ({
      filename: chart.filename,
      blob: await canvasToBlob(chart.canvas),
    })),
  );

  for (const file of files) {
    zip.file(file.filename, file.blob);
  }

  downloadExportBlob(
    await zip.generateAsync({ type: "blob", compression: "STORE" }),
    getChartExportFilename("zip"),
  );
}

export async function generatePngFromChart(
  chart: CapturedChart,
): Promise<void> {
  downloadExportBlob(await canvasToBlob(chart.canvas), chart.filename);
}

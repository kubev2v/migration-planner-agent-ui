import JSZip from "jszip";
import type { ChartExportFile } from "./chartExport.js";

export async function zipChartPngs(files: ChartExportFile[]): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, file.blob);
  }
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

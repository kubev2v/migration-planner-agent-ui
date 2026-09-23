import type { ReactNode } from "react";
import type { ChartPrintHostHandle } from "./ChartPrintHost";

export interface ExportChartSpec {
  id: string;
  title: string;
  filename: string;
  node: ReactNode;
}

export interface CapturedChart {
  id: string;
  title: string;
  filename: string;
  canvas: HTMLCanvasElement;
}

export async function captureExportCharts(
  printHost: ChartPrintHostHandle,
  specs: ExportChartSpec[],
): Promise<CapturedChart[]> {
  try {
    const captured: CapturedChart[] = [];
    for (const spec of specs) {
      const canvas = await printHost.capture(spec.node);
      captured.push({
        id: spec.id,
        title: spec.title,
        filename: spec.filename,
        canvas,
      });
    }
    return captured;
  } finally {
    printHost.clear();
  }
}

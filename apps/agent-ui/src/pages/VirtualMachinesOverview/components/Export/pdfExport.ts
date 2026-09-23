import jsPDF from "jspdf";
import type { CapturedChart } from "./captureExportCharts";
import {
  getChartExportFilename,
  sliceCanvas,
  splitSegmentForPageHeight,
} from "./chartExportCapture";
import { downloadExportBlob } from "./downloadExportBlob";

const MARGIN_MM = 10;
const PAGE_BACKGROUND = "#ffffff";

export async function generatePdfFromCharts(
  charts: CapturedChart[],
  documentTitle: string,
): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_MM * 2;
  const contentHeight = pageHeight - MARGIN_MM * 2;

  addCoverPage(
    pdf,
    documentTitle,
    charts.map((chart) => chart.title),
    pageWidth,
    pageHeight,
  );

  for (const chart of charts) {
    pdf.addPage();
    const scaleFactor = contentWidth / Math.max(1, chart.canvas.width);
    const pageHeightPx = contentHeight / scaleFactor;
    const segments = splitSegmentForPageHeight(
      { top: 0, height: chart.canvas.height },
      chart.canvas.height,
      pageHeightPx,
    );

    for (let index = 0; index < segments.length; index++) {
      if (index > 0) {
        pdf.addPage();
      }
      const { top, height } = segments[index];
      const sliceHeight = Math.max(
        1,
        Math.min(height, chart.canvas.height - top),
      );
      const pageCanvas = sliceCanvas(
        chart.canvas,
        chart.canvas.width,
        sliceHeight,
        top,
        PAGE_BACKGROUND,
      );
      addCanvasPage(
        pdf,
        pageCanvas,
        sliceHeight,
        contentWidth,
        contentHeight,
        MARGIN_MM,
      );
    }
  }

  addPageNumbers(pdf, pageWidth, pageHeight);
  downloadExportBlob(pdf.output("blob"), getChartExportFilename("pdf"));
}

function addCoverPage(
  pdf: jsPDF,
  documentTitle: string,
  tocItems: string[],
  pageWidth: number,
  pageHeight: number,
): void {
  const contentWidth = pageWidth - MARGIN_MM * 2;
  pdf.setFontSize(18);
  const titleLines = pdf.splitTextToSize(
    documentTitle,
    contentWidth,
  ) as string[];
  let titleY = MARGIN_MM + 8;
  for (const line of titleLines) {
    pdf.text(line, pageWidth / 2, titleY, { align: "center" });
    titleY += 8;
  }

  pdf.setFontSize(11);
  const generatedAt = new Date();
  pdf.text(
    `Generated: ${generatedAt.toLocaleDateString()} ${generatedAt.toLocaleTimeString()}`,
    pageWidth / 2,
    titleY + 4,
    { align: "center" },
  );

  pdf.setFontSize(14);
  pdf.text("Table of contents", MARGIN_MM, titleY + 16);
  pdf.setFontSize(11);
  let tocY = titleY + 26;
  for (const item of tocItems) {
    if (tocY > pageHeight - MARGIN_MM - 10) {
      pdf.addPage();
      tocY = MARGIN_MM;
    }
    pdf.text(`- ${item}`, MARGIN_MM, tocY);
    tocY += 7;
  }
}

function addCanvasPage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  sliceHeightPx: number,
  contentWidth: number,
  contentHeight: number,
  margin: number,
): void {
  const imageData = canvas.toDataURL("image/png");
  const pageScale = Math.min(
    contentWidth / canvas.width,
    contentHeight / sliceHeightPx,
  );
  const renderWidthMm = canvas.width * pageScale;
  const renderHeightMm = sliceHeightPx * pageScale;
  pdf.addImage(
    imageData,
    "PNG",
    margin + (contentWidth - renderWidthMm) / 2,
    margin,
    renderWidthMm,
    renderHeightMm,
  );
}

function addPageNumbers(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
): void {
  const totalPages = pdf.getNumberOfPages();
  pdf.setFontSize(9);
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 6, {
      align: "center",
    });
  }
}

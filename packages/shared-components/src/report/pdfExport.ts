import jsPDF from "jspdf";
import {
  type ChartCaptureSource,
  type PdfTextPage,
  releaseCanvas,
} from "./chartExport.js";
import { fitPdfImageSize, placePdfBlock, sliceCanvas } from "./pdfPage.js";

const MARGIN_MM = 10;
const GAP_MM = 8;
/** Flatten captures onto white; jsPDF cannot embed transparent PNG alpha cleanly. */
const PAGE_BACKGROUND = "#ffffff";

export async function buildPdfFromCharts(
  charts: ChartCaptureSource[],
  documentTitle: string,
  extraPages: PdfTextPage[] = [],
): Promise<Blob> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_MM * 2;
  const contentHeight = pageHeight - MARGIN_MM * 2;
  const pageTop = MARGIN_MM;
  const pageBottom = pageHeight - MARGIN_MM;

  addCoverPage(
    pdf,
    documentTitle,
    [...charts.map((chart) => chart.title), ...extraPages.map((p) => p.title)],
    pageWidth,
    pageHeight,
  );

  let cursorY: number | null = null;
  for (const chart of charts) {
    const canvas = await chart.capture();
    try {
      if (canvas.width < 1 || canvas.height < 1) {
        throw new Error("Chart capture produced an empty image");
      }
      const size = fitPdfImageSize(
        canvas.width,
        canvas.height,
        contentWidth,
        contentHeight,
      );
      const placement = placePdfBlock(
        cursorY,
        size.heightMm,
        pageTop,
        pageBottom,
      );
      if (placement.needsNewPage) {
        pdf.addPage();
      }
      addChartImage(
        pdf,
        canvas,
        MARGIN_MM + (contentWidth - size.widthMm) / 2,
        placement.y,
        size.widthMm,
        size.heightMm,
      );
      cursorY = placement.y + size.heightMm + GAP_MM;
    } finally {
      releaseCanvas(canvas);
    }
  }

  if (extraPages.length > 0) {
    addExtraPages(pdf, extraPages, pageWidth, pageHeight);
  }

  addPageNumbers(pdf, pageWidth, pageHeight);
  return pdf.output("blob");
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

function addChartImage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  widthMm: number,
  heightMm: number,
): void {
  const flattened = sliceCanvas(
    canvas,
    canvas.width,
    canvas.height,
    0,
    PAGE_BACKGROUND,
  );
  try {
    pdf.addImage(
      flattened.toDataURL("image/jpeg", 0.92),
      "JPEG",
      x,
      y,
      widthMm,
      heightMm,
    );
  } finally {
    releaseCanvas(flattened);
  }
}

/**
 * Append one native-text PDF page per entry in `extraPages`, rendered as
 * label/value rows rather than a captured image. Each page starts fresh so
 * its content never bleeds into a chart page.
 */
function addExtraPages(
  pdf: jsPDF,
  extraPages: PdfTextPage[],
  pageWidth: number,
  pageHeight: number,
): void {
  const LABEL_COL_WIDTH = 68; // mm — enough for the longest label
  const VALUE_COL_X = MARGIN_MM + LABEL_COL_WIDTH;
  const VALUE_COL_WIDTH = pageWidth - MARGIN_MM - LABEL_COL_WIDTH;
  const LINE_HEIGHT = 7; // mm between rows

  for (const page of extraPages) {
    pdf.addPage();
    let y = MARGIN_MM + 8;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(page.title, MARGIN_MM, y);
    y += 10;

    pdf.setDrawColor(0, 103, 187);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN_MM, y, pageWidth - MARGIN_MM, y);
    y += 10;

    pdf.setFontSize(11);

    for (const item of page.items) {
      pdf.setFont("helvetica", "bold");
      const labelLines = pdf.splitTextToSize(
        item.label,
        LABEL_COL_WIDTH - 4,
      ) as string[];
      pdf.text(labelLines, MARGIN_MM, y);

      pdf.setFont("helvetica", "normal");
      const valueLines = pdf.splitTextToSize(
        item.value,
        VALUE_COL_WIDTH,
      ) as string[];
      pdf.text(valueLines, VALUE_COL_X, y);

      y += LINE_HEIGHT * Math.max(labelLines.length, valueLines.length);

      if (y > pageHeight - MARGIN_MM - 25) {
        pdf.addPage();
        y = MARGIN_MM + 10;
      }
    }

    if (page.footer) {
      y += 4;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bolditalic");
      const footerLines = pdf.splitTextToSize(
        page.footer,
        pageWidth - MARGIN_MM * 2,
      ) as string[];
      pdf.text(footerLines, MARGIN_MM, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
    }
  }
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

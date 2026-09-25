export interface ReportExportOption {
  key: string;
  label: string;
  description?: string;
  onSelect: () => void;
  isDisabled?: boolean;
}

export interface StandardReportExportHandlers {
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onExportHtml?: () => void;
}

/**
 * Standard report-download actions. Omit a handler to hide that format.
 */
export const standardReportExportOptions = ({
  onExportPdf,
  onExportPng,
  onExportHtml,
}: StandardReportExportHandlers): ReportExportOption[] => {
  const options: ReportExportOption[] = [];

  if (onExportPdf) {
    options.push({
      key: "pdf",
      label: "PDF",
      description: "Export the report as a PDF",
      onSelect: onExportPdf,
    });
  }

  if (onExportHtml) {
    options.push({
      key: "html",
      label: "HTML",
      description: "Export the report as HTML",
      onSelect: onExportHtml,
    });
  }

  if (onExportPng) {
    options.push({
      key: "png",
      label: "PNG",
      description: "Download all charts as PNG files",
      onSelect: onExportPng,
    });
  }

  return options;
};

import {
  type ReportExportOption,
  type StandardReportExportHandlers,
  standardReportExportOptions,
} from "@openshift-migration-advisor/shared-components";

export type OverviewExportHandlers = StandardReportExportHandlers & {
  onExportInventory?: () => void;
};

/**
 * PDF / HTML / PNG plus the agent-ui inventory spreadsheet action.
 * Omit a handler to hide that format (HTML is omitted on a cluster view).
 */
export function buildOverviewExportOptions({
  onExportInventory,
  ...handlers
}: OverviewExportHandlers): ReportExportOption[] {
  const options = standardReportExportOptions(handlers);

  if (onExportInventory) {
    options.push({
      key: "inventory",
      label: "Spreadsheet",
      description: "Download inventory as XLSX or ZIP",
      onSelect: onExportInventory,
    });
  }

  return options;
}

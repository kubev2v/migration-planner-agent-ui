export function getDatedChartExportBasename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `migration-export-${year}-${month}-${day}`;
}

export function getChartExportFilename(
  format: "pdf" | "html" | "zip",
  date = new Date(),
): string {
  const base = getDatedChartExportBasename(date);
  if (format === "zip") {
    return `${base}-charts.zip`;
  }
  return `${base}.${format}`;
}

export function getChartZipFilename(date = new Date()): string {
  return getChartExportFilename("zip", date);
}

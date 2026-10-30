export const formatRvtoolsFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
};

/** User-facing text for backend RVTools validation errors (no trailing period). */
export const formatRvtoolsBackendErrorMessage = (message: string): string => {
  const trimmed = message.trim().replace(/\.$/, "");
  const normalized = trimmed.toLowerCase();
  if (
    normalized === "could not read excel file" ||
    (normalized.includes("could not read") && normalized.includes("excel"))
  ) {
    return "This file could not be read as an Excel workbook";
  }
  return trimmed;
};

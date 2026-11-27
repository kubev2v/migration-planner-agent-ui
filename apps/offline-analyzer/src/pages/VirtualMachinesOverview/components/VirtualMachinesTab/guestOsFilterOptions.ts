/** Distinct guest OS values for filter dropdowns (union of config and tools lists). */
export function mergeGuestOsFilterOptions(
  osConfigs: string[],
  osTools: string[],
): string[] {
  return [...new Set([...osConfigs, ...osTools].filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

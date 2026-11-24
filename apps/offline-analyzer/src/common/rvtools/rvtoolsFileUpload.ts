export const MAX_RVTOOLS_FILES = 50;

export function mergeRvtoolsFilesByName(
  current: File[],
  accepted: File[],
  maxFiles: number = MAX_RVTOOLS_FILES,
): { files: File[]; overLimit: boolean } {
  const byName = new Map(current.map((file) => [file.name, file]));
  for (const file of accepted) {
    byName.set(file.name, file);
  }
  const merged = Array.from(byName.values());
  if (merged.length > maxFiles) {
    return { files: merged.slice(0, maxFiles), overLimit: true };
  }
  return { files: merged, overLimit: false };
}

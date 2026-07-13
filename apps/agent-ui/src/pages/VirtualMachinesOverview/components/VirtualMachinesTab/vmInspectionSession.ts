export const CANCELED_INSPECTION_VMS_SESSION_KEY =
  "vm-inspection-user-canceled-vms";

export function loadUserCanceledInspectionVmIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CANCELED_INSPECTION_VMS_SESSION_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveUserCanceledInspectionVmIds(
  ids: ReadonlySet<string>,
): void {
  try {
    sessionStorage.setItem(
      CANCELED_INSPECTION_VMS_SESSION_KEY,
      JSON.stringify([...ids]),
    );
  } catch {
    // ignore if sessionStorage is unavailable
  }
}

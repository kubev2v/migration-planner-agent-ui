import {
  ResponseError,
  type VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";

export function isVmUnderInspection(vm: VirtualMachine): boolean {
  const state = vm.inspectionStatus?.state;
  return state === "running" || state === "pending";
}

export type DeepInspectionEnablementReason =
  | "none-selected"
  | "all-under-inspection"
  | "mixed"
  | "unknown-selection"
  | "selection-load-failed"
  | "enabled";

/** Backend session limit for deep inspection queue size. */
export const MAX_INSPECTION_VMS = 11;

export function collectVmIdsUnderInspection(
  vms: Iterable<VirtualMachine>,
): string[] {
  const ids: string[] = [];
  for (const vm of vms) {
    if (isVmUnderInspection(vm)) {
      ids.push(vm.id);
    }
  }
  return ids;
}

export type DeepInspectionEnablement = {
  enabled: boolean;
  reason: DeepInspectionEnablementReason;
};

export function getDeepInspectionEnablement(
  vmIds: Iterable<string>,
  vms: VirtualMachine[],
): DeepInspectionEnablement {
  const ids = [...vmIds];
  if (ids.length === 0) {
    return { enabled: false, reason: "none-selected" };
  }

  const vmById = new Map(vms.map((vm) => [vm.id, vm]));
  let underInspection = 0;
  let notUnderInspection = 0;

  for (const id of ids) {
    const vm = vmById.get(id);
    if (!vm) {
      return { enabled: false, reason: "unknown-selection" };
    }
    if (isVmUnderInspection(vm)) {
      underInspection += 1;
    } else {
      notUnderInspection += 1;
    }
  }

  if (underInspection > 0 && notUnderInspection > 0) {
    return { enabled: false, reason: "mixed" };
  }
  if (underInspection > 0) {
    return { enabled: false, reason: "all-under-inspection" };
  }
  return { enabled: true, reason: "enabled" };
}

export function getDeepInspectionDisabledTooltip(
  reason: DeepInspectionEnablementReason,
): string {
  switch (reason) {
    case "none-selected":
      return "Select VMs for deep inspection.";
    case "all-under-inspection":
      return "Selected VMs are already under deep inspection.";
    case "mixed":
      return "Select only VMs that are not already under deep inspection.";
    case "unknown-selection":
      return "Loading inspection status for the selected VMs.";
    case "selection-load-failed":
      return "Unable to load inspection status for the selected VMs. Try again.";
    default:
      return "Select VMs for deep inspection.";
  }
}

export function getDeepInspectionEnablementForVmAction(
  vmId: string,
  selectedVMs: Set<string>,
  vms: VirtualMachine[],
): DeepInspectionEnablement {
  const merged = new Set(selectedVMs);
  merged.add(vmId);
  return getDeepInspectionEnablement(merged, vms);
}

/** Union selected VMs with VMs already in the active inspection queue. */
export function buildStartInspectionVmIds(
  selectedVmIds: string[],
  vmIdsUnderInspection: Iterable<string>,
): string[] {
  return [...new Set([...selectedVmIds, ...vmIdsUnderInspection])];
}

const CANCEL_RETRY_DELAY_MS = 2000;
const CANCEL_MAX_ATTEMPTS = 5;

/**
 * Heuristic: the backend may report user-initiated mid-run cancels as `error`
 * (virt-inspector killed with exit code 1) rather than state `canceled`.
 * Natural virt-inspector crashes can match the same pattern — a distinct
 * backend flag would be needed to tell them apart reliably.
 */
export function isLikelyCanceledInspectionError(error?: string): boolean {
  if (!error) return false;
  return /virt-inspector failed \(exit code/i.test(error);
}

function isRetryableCancelError(err: unknown): boolean {
  if (!(err instanceof ResponseError)) return false;
  const status = err.response?.status;
  return status === 400 || status === 409 || status === 503;
}

/**
 * DELETE /vms/{id}/inspection — bypasses the SDK because the endpoint may
 * return 200/204 with an empty body, which breaks JSONApiResponse parsing.
 */
async function removeVmFromInspection(
  basePath: string,
  vmId: string,
): Promise<void> {
  const res = await fetch(
    `${basePath}/vms/${encodeURIComponent(vmId)}/inspection`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    throw new ResponseError(res, `HTTP ${res.status}`);
  }

  // Body is optional on success.
  await res.text();
}

export async function cancelVmInspectionWithRetry(
  basePath: string,
  vmId: string,
): Promise<void> {
  for (let attempt = 0; attempt < CANCEL_MAX_ATTEMPTS; attempt++) {
    try {
      await removeVmFromInspection(basePath, vmId);
      return;
    } catch (err) {
      const isLastAttempt = attempt === CANCEL_MAX_ATTEMPTS - 1;
      if (!isRetryableCancelError(err) || isLastAttempt) {
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, CANCEL_RETRY_DELAY_MS),
      );
    }
  }
}

export async function extractCancelInspectionErrorMessage(
  err: unknown,
): Promise<string> {
  if (err instanceof ResponseError) {
    try {
      const text = await err.response.clone().text();
      if (text) {
        const body = JSON.parse(text);
        if (typeof body?.message === "string" && body.message) {
          return body.message;
        }
        if (typeof body?.error === "string" && body.error) {
          return body.error;
        }
      }
    } catch {
      // fall through to status-based message
    }

    const status = err.response?.status;
    if (status === 400) {
      return "This VM cannot be canceled right now. The inspector may still be finishing the current step.";
    }
    if (status === 404) {
      return "This VM is no longer in the inspection queue.";
    }
  }

  return err instanceof Error
    ? err.message
    : "Failed to cancel deep inspection";
}

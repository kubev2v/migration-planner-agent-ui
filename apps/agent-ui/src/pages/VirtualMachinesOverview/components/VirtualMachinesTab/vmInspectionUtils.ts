import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { getSdkErrorMessage } from "../../../../store/baseQuery";

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

/**
 * Human-readable message for a failed cancel. The cancel mutation rejects with
 * the baseQuery `{ status, message }` shape (not a `ResponseError`), so the
 * status-specific copy is chosen from `status`; any other failure falls back to
 * the server-provided message.
 */
export function extractCancelInspectionErrorMessage(err: unknown): string {
  const status = (err as { status?: number } | null)?.status;
  if (status === 400) {
    return "This VM cannot be canceled right now. The inspector may still be finishing the current step.";
  }
  if (status === 404) {
    return "This VM is no longer in the inspection queue.";
  }

  return getSdkErrorMessage(err, "Failed to cancel deep inspection");
}

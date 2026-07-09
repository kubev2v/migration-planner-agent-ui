import type {
  ApplicationOverview,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";

export type {
  ApplicationListResponse,
  ApplicationOverview,
  ApplicationVM,
} from "@openshift-migration-advisor/agent-sdk";

/** Build a VM id → application names lookup from the global applications list. */
export function buildVmApplicationsMap(
  applications: ApplicationOverview[],
): Map<string, string[]> {
  const map = new Map<string, Set<string>>();

  for (const application of applications) {
    for (const vm of application.vms) {
      const names = map.get(vm.id) ?? new Set<string>();
      names.add(application.name);
      map.set(vm.id, names);
    }
  }

  const result = new Map<string, string[]>();
  for (const [vmId, names] of map) {
    result.set(
      vmId,
      [...names].sort((a, b) => a.localeCompare(b)),
    );
  }
  return result;
}

export function mergeVmApplicationNames<T extends VirtualMachine>(
  vms: T[],
  vmApplications: Map<string, string[]>,
): (T & { applicationNames: string[] })[] {
  return vms.map((vm) => ({
    ...vm,
    applicationNames: vmApplications.get(vm.id) ?? [],
  }));
}

/** Return applications detected on a single VM. */
export function getApplicationsForVm(
  applications: ApplicationOverview[],
  vmId: string,
): ApplicationOverview[] {
  return applications.filter((application) =>
    application.vms.some((vm) => vm.id === vmId),
  );
}

/** Restrict applications to VMs in the given scope (e.g. group membership). */
export function scopeApplicationsToVms(
  applications: ApplicationOverview[],
  scopedVmIds: Set<string>,
): ApplicationOverview[] {
  if (scopedVmIds.size === 0) {
    return [];
  }

  return applications
    .map((application) => {
      const vms = application.vms.filter((vm) => scopedVmIds.has(vm.id));
      if (vms.length === 0) {
        return null;
      }
      return {
        ...application,
        vms,
        vmCount: vms.length,
      };
    })
    .filter((application): application is ApplicationOverview =>
      Boolean(application),
    );
}

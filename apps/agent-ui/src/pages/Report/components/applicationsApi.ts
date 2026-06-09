import type { ApplicationOverview } from "@openshift-migration-advisor/agent-sdk";

export type {
  ApplicationListResponse,
  ApplicationOverview,
  ApplicationVM,
} from "@openshift-migration-advisor/agent-sdk";

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

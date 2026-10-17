import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";

export type VirtualMachineWithExclusion = VirtualMachine & {
  migrationExcluded?: boolean;
};

type VirtualMachineJson = VirtualMachineWithExclusion & {
  migration_excluded?: boolean;
  tags?: string[];
};

export function getMigrationExcluded(
  vm: VirtualMachine | undefined,
): boolean | undefined {
  return (vm as VirtualMachineWithExclusion | undefined)?.migrationExcluded;
}

/** VM labels for display/filtering (`labels` on v2 list model). */
export function getVmTags(vm: VirtualMachine): string[] {
  if (vm.labels?.length) {
    return vm.labels;
  }
  // Legacy/local mocks may still use `tags`
  return (vm as VirtualMachineJson).tags ?? [];
}

/** Normalize VM JSON (handles snake_case migration_excluded). */
export function normalizeVirtualMachine(vm: VirtualMachine): VirtualMachine {
  const raw = vm as VirtualMachineJson;
  const migrationExcluded =
    raw.migrationExcluded ?? raw.migration_excluded ?? undefined;
  const labels = raw.labels ?? raw.tags;

  if (migrationExcluded === undefined && labels === undefined) {
    return vm;
  }

  return {
    ...vm,
    ...(migrationExcluded !== undefined ? { migrationExcluded } : {}),
    ...(labels !== undefined ? { labels } : {}),
  };
}

export function normalizeVirtualMachines(
  vms: VirtualMachine[] | undefined,
): VirtualMachine[] {
  return (vms ?? []).map(normalizeVirtualMachine);
}

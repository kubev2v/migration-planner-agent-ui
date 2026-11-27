import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";

export type VirtualMachineWithExclusion = VirtualMachine & {
  migrationExcluded?: boolean;
};

type VirtualMachineJson = VirtualMachineWithExclusion & {
  migration_excluded?: boolean;
  tags?: string[];
  guestName?: string;
  guestNameFromVmwareTools?: string;
  os_config?: string;
  os_tools?: string;
  osConfig?: string;
  osTools?: string;
};

export function getMigrationExcluded(
  vm: VirtualMachine | undefined,
): boolean | undefined {
  return (vm as VirtualMachineWithExclusion | undefined)?.migrationExcluded;
}

/** Guest OS from VM configuration (API guestName / filter os_config). */
export function getVmOsConfig(vm: VirtualMachine): string | undefined {
  const raw = vm as VirtualMachineJson;
  const value = raw.guestName ?? raw.osConfig ?? raw.os_config;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Guest OS reported by VMware Tools (API guestNameFromVmwareTools / filter os_tools). */
export function getVmOsTools(vm: VirtualMachine): string | undefined {
  const raw = vm as VirtualMachineJson;
  const value = raw.guestNameFromVmwareTools ?? raw.osTools ?? raw.os_tools;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Effective guest OS for display (inventory: VMware Tools, else configuration). */
export function getVmGuestOs(vm: VirtualMachine): string | undefined {
  return getVmOsTools(vm) ?? getVmOsConfig(vm);
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

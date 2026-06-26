import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";

type VirtualMachineJson = VirtualMachine & { migration_excluded?: boolean };

/** Normalize VM JSON from GET /vms (handles snake_case migration_excluded). */
export function normalizeVirtualMachine(vm: VirtualMachine): VirtualMachine {
  const raw = vm as VirtualMachineJson;
  if (
    raw.migrationExcluded === undefined &&
    raw.migration_excluded !== undefined
  ) {
    return { ...vm, migrationExcluded: raw.migration_excluded };
  }
  return vm;
}

export function normalizeVirtualMachines(
  vms: VirtualMachine[] | undefined,
): VirtualMachine[] {
  return (vms ?? []).map(normalizeVirtualMachine);
}

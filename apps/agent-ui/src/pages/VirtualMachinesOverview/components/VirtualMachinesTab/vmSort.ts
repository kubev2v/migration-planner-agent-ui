import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";

// Use a large multiplier to ensure no overlap between groups
const GROUP_MULTIPLIER = 10_000;

export function getVmApplicationCount(vm: VirtualMachine): number {
  if (
    "applicationNames" in vm &&
    Array.isArray((vm as { applicationNames?: unknown }).applicationNames)
  ) {
    return (vm as { applicationNames: string[] }).applicationNames.length;
  }
  return 0;
}

export const applicationsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmApplicationCount(vm);

export function getVmLabelCount(vm: VirtualMachine): number {
  const labels = (vm as VirtualMachine & { labels?: unknown }).labels;
  return Array.isArray(labels) ? labels.length : 0;
}

export const labelsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmLabelCount(vm);

export function getVmGroupCount(vm: VirtualMachine): number {
  const groupItems = (vm as { groupItems?: unknown }).groupItems;
  return Array.isArray(groupItems) ? groupItems.length : 0;
}

export const groupsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmGroupCount(vm);

export const deepInspectionSort: (vm: VirtualMachine) => number = (vm) => {
  const state = vm.inspectionStatus?.state;
  const concernCount = vm.inspectionConcernCount || 0;

  switch (state) {
    case "running":
      return 0;

    case "pending":
      return 1 * GROUP_MULTIPLIER;

    case "completed":
      return 2 * GROUP_MULTIPLIER + concernCount;

    case "error":
      return 3 * GROUP_MULTIPLIER + concernCount;

    case "canceled":
      return 4 * GROUP_MULTIPLIER;

    default:
      return 5 * GROUP_MULTIPLIER;
  }
};

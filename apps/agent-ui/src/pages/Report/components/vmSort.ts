import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";

// Use a large multiplier to ensure no overlap between groups
const GROUP_MULTIPLIER = 10_000;

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

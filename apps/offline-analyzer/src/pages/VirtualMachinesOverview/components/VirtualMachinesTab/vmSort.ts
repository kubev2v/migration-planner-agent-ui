import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { getVmTags } from "../../virtualMachineParsing";

export function getVmLabelCount(vm: VirtualMachine): number {
  return getVmTags(vm).length;
}

export const labelsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmLabelCount(vm);

export function getVmGroupCount(vm: VirtualMachine): number {
  const groupItems = (vm as { groupItems?: unknown }).groupItems;
  return Array.isArray(groupItems) ? groupItems.length : 0;
}

export const groupsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmGroupCount(vm);

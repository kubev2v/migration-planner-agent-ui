import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { getVmTags, getVmVSphereTags } from "../../virtualMachineParsing";

export function getVmGroupCount(vm: VirtualMachine): number {
  const groupItems = (vm as { groupItems?: unknown }).groupItems;
  return Array.isArray(groupItems) ? groupItems.length : 0;
}

export function getVmLabelCount(vm: VirtualMachine): number {
  return getVmTags(vm).length;
}

export const labelsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmLabelCount(vm);

export const vsphereTagsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmVSphereTags(vm).length;

export const groupsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmGroupCount(vm);

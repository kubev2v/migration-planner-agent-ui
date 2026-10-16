import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { getVmTags } from "../../virtualMachineParsing";

export function getVmLabelCount(vm: VirtualMachine): number {
  return getVmTags(vm).length;
}

export const labelsSort: (vm: VirtualMachine) => number = (vm) =>
  getVmLabelCount(vm);

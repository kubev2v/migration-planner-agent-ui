import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
import {
  buildVmGroupMembership,
  mergeVmGroupItems,
  type VirtualMachineWithGroupItems,
} from "../../../Groups/utils/vmGroupMembership";
import { fetchAllMatchingVms } from "../VirtualMachinesTab/vmSelection";

function escapeApplicationFilterValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function applicationFilterExpression(applicationName: string): string {
  return `application = '${escapeApplicationFilterValue(applicationName)}'`;
}

export async function fetchApplicationDrawerVms(
  agentApi: DefaultApiInterface,
  applicationName: string,
): Promise<VirtualMachineWithGroupItems[]> {
  const [vms, membership] = await Promise.all([
    fetchAllMatchingVms(agentApi, {
      byExpression: applicationFilterExpression(applicationName),
    }),
    buildVmGroupMembership(agentApi),
  ]);

  return mergeVmGroupItems(vms, membership);
}

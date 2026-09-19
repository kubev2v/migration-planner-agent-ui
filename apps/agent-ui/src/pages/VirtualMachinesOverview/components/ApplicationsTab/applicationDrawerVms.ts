import type { DefaultApiInterface } from "../../../../api/agentApi";
import { combineFilterExpressions } from "../../../Groups/utils/groupFilters";
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

/** Application-name filter, optionally AND-ed with a VM membership scope. */
export function applicationDrawerByExpression(
  applicationName: string,
  scopeExpression?: string,
): string | undefined {
  return combineFilterExpressions(
    applicationFilterExpression(applicationName),
    scopeExpression,
  );
}

export async function fetchApplicationDrawerVms(
  agentApi: DefaultApiInterface,
  applicationName: string,
  scopeExpression?: string,
): Promise<VirtualMachineWithGroupItems[]> {
  const [vms, membership] = await Promise.all([
    fetchAllMatchingVms(agentApi, {
      byExpression: applicationDrawerByExpression(
        applicationName,
        scopeExpression,
      ),
    }),
    buildVmGroupMembership(agentApi),
  ]);

  return mergeVmGroupItems(vms, membership);
}

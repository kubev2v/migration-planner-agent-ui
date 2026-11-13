import type { DefaultApiInterface } from "../../../../api/agentApi";
import { combineFilterExpressions } from "../../../Groups/utils/groupFilters";
import {
  buildVmGroupMembership,
  mergeVmGroupItems,
  type VirtualMachineWithGroupItems,
} from "../../../Groups/utils/vmGroupMembership";
import { fetchAllMatchingVms } from "../VirtualMachinesTab/vmSelection";

function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function applianceFilterExpression(applianceName: string): string {
  return `product.name = '${escapeFilterValue(applianceName)}'`;
}

export function applianceDrawerByExpression(
  applianceName: string,
  scopeExpression?: string,
): string | undefined {
  return combineFilterExpressions(
    applianceFilterExpression(applianceName),
    scopeExpression,
  );
}

export async function fetchApplianceDrawerVms(
  agentApi: DefaultApiInterface,
  applianceName: string,
  scopeExpression?: string,
): Promise<VirtualMachineWithGroupItems[]> {
  const [vms, membership] = await Promise.all([
    fetchAllMatchingVms(agentApi, {
      byExpression: applianceDrawerByExpression(applianceName, scopeExpression),
    }),
    buildVmGroupMembership(agentApi),
  ]);
  return mergeVmGroupItems(vms, membership);
}

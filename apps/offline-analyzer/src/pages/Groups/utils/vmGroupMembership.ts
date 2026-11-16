import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../../api/agentApi";
import { fetchAllMatchingVmIds } from "../../VirtualMachinesOverview/components/VirtualMachinesTab/vmSelection";
import { parseIdsFromFilter } from "./groupFilters";
import { fetchAllGroupsPages } from "./groupList";

export type GroupListItem = {
  id: string;
  name: string;
};

export type VirtualMachineWithGroupItems = VirtualMachine & {
  groupItems: GroupListItem[];
};

export type VmGroupMembershipData = Record<string, GroupListItem[]>;

function addGroupToVm(
  map: VmGroupMembershipData,
  vmId: string,
  group: GroupListItem,
): void {
  const existing = map[vmId] ?? [];
  if (existing.some((item) => item.id === group.id)) return;
  map[vmId] = [...existing, group].sort((a, b) => a.name.localeCompare(b.name));
}

/** Builds a VM ID to groups map, including groups defined by dynamic filters. */
export async function buildVmGroupMembership(
  agentApi: DefaultApiInterface,
): Promise<VmGroupMembershipData> {
  const vmIdToGroups: VmGroupMembershipData = {};
  const groups = await fetchAllGroupsPages(agentApi);

  for (const group of groups) {
    const groupItem = { id: group.id, name: group.name };
    const explicitIds = parseIdsFromFilter(group.filter);
    const matchingIds =
      explicitIds ??
      (await fetchAllMatchingVmIds(agentApi, {
        byExpression: group.filter,
      }));

    for (const vmId of matchingIds) {
      addGroupToVm(vmIdToGroups, vmId, groupItem);
    }
  }

  return vmIdToGroups;
}

export function mergeVmGroupItems(
  vms: VirtualMachine[],
  membership: VmGroupMembershipData,
): VirtualMachineWithGroupItems[] {
  return vms.map((vm) => ({
    ...vm,
    groupItems: membership[vm.id] ?? [],
  }));
}

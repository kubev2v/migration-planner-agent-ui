import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { fetchAllMatchingVmIds } from "../../VirtualMachinesOverview/components/VirtualMachinesTab/vmSelection";
import { parseIdsFromFilter } from "./groupFilters";
import { fetchAllGroups } from "./groupList";

export type GroupListItem = {
  id: string;
  name: string;
};

export type VirtualMachineWithGroupItems = VirtualMachine & {
  groupItems: GroupListItem[];
};

export type VmGroupMembershipData = {
  vmIdToGroups: Record<string, GroupListItem[]>;
  groupsByName: Record<string, GroupListItem>;
};

function addGroupToVm(
  map: Record<string, GroupListItem[]>,
  vmId: string,
  group: GroupListItem,
): void {
  const existing = map[vmId] ?? [];
  if (existing.some((item) => item.id === group.id)) {
    return;
  }
  map[vmId] = [...existing, group].sort((a, b) => a.name.localeCompare(b.name));
}

/** Builds vm id → groups and a name lookup from all groups. */
export async function buildVmGroupMembership(
  agentApi: DefaultApiInterface,
): Promise<VmGroupMembershipData> {
  const vmIdToGroups = Object.create(null) as Record<string, GroupListItem[]>;
  const groupsByName = Object.create(null) as Record<string, GroupListItem>;

  const allGroups = await fetchAllGroups(agentApi);

  for (const group of allGroups) {
    const groupItem = { id: group.id, name: group.name };
    const existingByName = groupsByName[group.name];
    if (existingByName !== undefined && existingByName.id !== group.id) {
      throw new Error(
        `Duplicate group name "${group.name}" with different ids: ${existingByName.id} and ${group.id}`,
      );
    }
    groupsByName[group.name] = groupItem;

    const explicitIds = parseIdsFromFilter(group.filter);
    if (explicitIds !== null) {
      for (const vmId of explicitIds) {
        addGroupToVm(vmIdToGroups, vmId, groupItem);
      }
      continue;
    }

    const matchingIds = await fetchAllMatchingVmIds(agentApi, {
      byExpression: group.filter,
    });
    for (const vmId of matchingIds) {
      addGroupToVm(vmIdToGroups, vmId, groupItem);
    }
  }

  return { vmIdToGroups, groupsByName };
}

export function mergeVmGroupItems(
  vms: VirtualMachine[],
  membership: VmGroupMembershipData,
): VirtualMachineWithGroupItems[] {
  const { vmIdToGroups, groupsByName } = membership;

  return vms.map((vm) => {
    let groupItems = vmIdToGroups[vm.id];

    if (!groupItems?.length && vm.groups?.length) {
      groupItems = vm.groups
        .map((name) => groupsByName[name])
        .filter((group): group is GroupListItem => group !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return { ...vm, groupItems: groupItems ?? [] };
  });
}

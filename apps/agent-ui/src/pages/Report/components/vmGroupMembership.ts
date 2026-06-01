import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { parseIdsFromFilter } from "./groupFilters";
import { fetchAllMatchingVmIds } from "./vmSelection";

const GROUP_LIST_PAGE_SIZE = 100;

function addGroupName(
  map: Map<string, string[]>,
  vmId: string,
  groupName: string,
): void {
  const existing = map.get(vmId) ?? [];
  if (existing.includes(groupName)) {
    return;
  }
  map.set(
    vmId,
    [...existing, groupName].sort((a, b) => a.localeCompare(b)),
  );
}

/** Builds vm id → group names from all groups (for VM overview when /vms omits groups). */
export async function buildVmIdToGroupNamesMap(
  agentApi: DefaultApiInterface,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();

  const firstPage = await agentApi.listGroups({
    page: 1,
    pageSize: GROUP_LIST_PAGE_SIZE,
  });

  const allGroups = [...(firstPage.groups ?? [])];
  const pageCount = firstPage.pageCount ?? 1;

  for (let page = 2; page <= pageCount; page++) {
    const response = await agentApi.listGroups({
      page,
      pageSize: GROUP_LIST_PAGE_SIZE,
    });
    allGroups.push(...(response.groups ?? []));
  }

  for (const group of allGroups) {
    const explicitIds = parseIdsFromFilter(group.filter);
    if (explicitIds !== null) {
      for (const vmId of explicitIds) {
        addGroupName(map, vmId, group.name);
      }
      continue;
    }

    const matchingIds = await fetchAllMatchingVmIds(agentApi, {
      byExpression: group.filter,
    });
    for (const vmId of matchingIds) {
      addGroupName(map, vmId, group.name);
    }
  }

  return map;
}

export function mergeVmGroupNames(
  vms: VirtualMachine[],
  vmIdToGroupNames: Map<string, string[]>,
): VirtualMachine[] {
  if (vmIdToGroupNames.size === 0) {
    return vms;
  }

  return vms.map((vm) => {
    if (vm.groups && vm.groups.length > 0) {
      return vm;
    }
    const groups = vmIdToGroupNames.get(vm.id);
    if (!groups || groups.length === 0) {
      return vm;
    }
    return { ...vm, groups };
  });
}

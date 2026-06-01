import type {
  DefaultApiInterface,
  Group,
} from "@openshift-migration-advisor/agent-sdk";

const GROUP_LIST_PAGE_SIZE = 100;

/** Fetches every group across all pages. */
export async function fetchAllGroups(
  agentApi: DefaultApiInterface,
  options?: { byName?: string },
): Promise<Group[]> {
  const allGroups: Group[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await agentApi.listGroups({
      byName: options?.byName,
      page,
      pageSize: GROUP_LIST_PAGE_SIZE,
    });
    allGroups.push(...(response.groups ?? []));
    pageCount = response.pageCount ?? 1;
    page++;
  }

  return allGroups;
}

import type { Group } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../../api/agentApi";

const GROUP_LIST_PAGE_SIZE = 100;

type GroupListAgentApi = Pick<DefaultApiInterface, "listLatestGroups">;

/**
 * Fetches every group across all pages. Uncached by design: the cache is RTK
 * Query's (see the `getAllGroups` endpoint / `useGetAllGroupsQuery`). Call this
 * only from inside a query function or an already-cached util path.
 */
export async function fetchAllGroupsPages(
  agentApi: GroupListAgentApi,
  options?: { byName?: string },
): Promise<Group[]> {
  const allGroups: Group[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await agentApi.listLatestGroups({
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

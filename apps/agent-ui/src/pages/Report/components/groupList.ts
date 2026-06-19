import type {
  DefaultApiInterface,
  Group,
} from "@openshift-migration-advisor/agent-sdk";

const GROUP_LIST_PAGE_SIZE = 100;
const GROUP_LIST_CACHE_TTL_MS = 30_000;

type GroupListCacheEntry = {
  expiresAt: number;
  promise: Promise<Group[]>;
};

const groupListCache = new WeakMap<DefaultApiInterface, GroupListCacheEntry>();

/** Clears cached group list so the next fetch hits the API. */
export function invalidateAllGroupsCache(agentApi: DefaultApiInterface): void {
  groupListCache.delete(agentApi);
}

async function fetchAllGroupsUncached(
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

/** Fetches every group across all pages. Results are cached briefly and deduped in-flight. */
export async function fetchAllGroups(
  agentApi: DefaultApiInterface,
  options?: { byName?: string },
): Promise<Group[]> {
  if (options?.byName !== undefined) {
    return fetchAllGroupsUncached(agentApi, options);
  }

  const now = Date.now();
  const cached = groupListCache.get(agentApi);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetchAllGroupsUncached(agentApi)
    .then((groups) => {
      groupListCache.set(agentApi, {
        expiresAt: Date.now() + GROUP_LIST_CACHE_TTL_MS,
        promise: Promise.resolve(groups),
      });
      return groups;
    })
    .catch((err) => {
      groupListCache.delete(agentApi);
      throw err;
    });

  groupListCache.set(agentApi, {
    expiresAt: now + GROUP_LIST_CACHE_TTL_MS,
    promise,
  });

  return promise;
}

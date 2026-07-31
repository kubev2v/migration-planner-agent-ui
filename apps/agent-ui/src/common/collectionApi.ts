import type { Collection } from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "./agentApi";

/** Returns collections sorted newest-first by createdAt. */
export async function listCollectionsNewestFirst(
  agentApi: DefaultApiInterface,
): Promise<Collection[]> {
  const res = await agentApi.listCollections();
  const collections = res.collections ?? [];
  return [...collections].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

/** Returns the newest collection, preferring latest createdAt when present. */
export async function getLatestCollection(
  agentApi: DefaultApiInterface,
): Promise<Collection | undefined> {
  const collections = await listCollectionsNewestFirst(agentApi);
  return collections[0];
}

/** Returns the newest collection id, preferring latest createdAt when present. */
export async function getLatestCollectionId(
  agentApi: DefaultApiInterface,
): Promise<string | undefined> {
  const latest = await getLatestCollection(agentApi);
  return latest?.id;
}

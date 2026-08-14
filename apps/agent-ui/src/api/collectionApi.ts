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

function isNewerCollection(
  candidate: Collection,
  previous?: Pick<Collection, "id" | "createdAt"> | null,
): boolean {
  if (!previous?.id) {
    return true;
  }
  if (candidate.id !== previous.id) {
    return true;
  }
  return candidate.createdAt.getTime() > previous.createdAt.getTime();
}

export type WaitForNewerCollectionResult = {
  collection?: Collection;
  foundNewer: boolean;
};

export type WaitForNewerCollectionOptions = {
  timeoutMs?: number;
  intervalMs?: number;
};

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_INTERVAL_MS = 1_000;

export function resolveWaitForNewerCollectionOptions(
  options?: WaitForNewerCollectionOptions,
): { timeoutMs: number; intervalMs: number } {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;

  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError(
      `timeoutMs must be a finite non-negative number, got ${String(options?.timeoutMs)}`,
    );
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new RangeError(
      `intervalMs must be a finite positive number, got ${String(options?.intervalMs)}`,
    );
  }

  return { timeoutMs, intervalMs };
}

/**
 * Polls until a collection newer than `previous` appears, or the timeout elapses.
 * Returns whether a newer collection was observed (`foundNewer`).
 */
export async function waitForNewerCollection(
  agentApi: DefaultApiInterface,
  previous?: Pick<Collection, "id" | "createdAt"> | null,
  options?: WaitForNewerCollectionOptions,
): Promise<WaitForNewerCollectionResult> {
  const { timeoutMs, intervalMs } =
    resolveWaitForNewerCollectionOptions(options);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const latest = await getLatestCollection(agentApi);
    if (latest && isNewerCollection(latest, previous)) {
      return { collection: latest, foundNewer: true };
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  const latest = await getLatestCollection(agentApi);
  return {
    collection: latest,
    foundNewer: Boolean(latest && isNewerCollection(latest, previous)),
  };
}

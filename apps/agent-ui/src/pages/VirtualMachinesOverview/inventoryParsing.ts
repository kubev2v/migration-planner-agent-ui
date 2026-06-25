import type {
  GetInventory200Response,
  Infra,
  Inventory,
  InventoryData,
  VirtualMachine,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import {
  InventoryFromJSON,
  instanceOfInventory,
  instanceOfUpdateInventory,
  UpdateInventoryFromJSON,
} from "@openshift-migration-advisor/agent-sdk";

export type MigrationExcludedInventoryChange = {
  vmIds: string[];
  excluded: boolean;
  affectedVms: VirtualMachine[];
};

/** Parse inventory from GET /inventory (direct Inventory or UpdateInventory wrapper). */
export function parseInventoryResponse(jsonData: unknown): Inventory | null {
  if (!jsonData || typeof jsonData !== "object") {
    return null;
  }
  const record = jsonData as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  if ("vcenter_id" in record && "clusters" in record) {
    return InventoryFromJSON(jsonData);
  }
  if ("inventory" in record) {
    const updateInventory = UpdateInventoryFromJSON(jsonData);
    return updateInventory.inventory ?? null;
  }
  return null;
}

/** Extract inventory from GET /inventory SDK response. */
export function inventoryFromGetInventoryResponse(
  response: GetInventory200Response | null | undefined,
): Inventory | null {
  if (!response || typeof response !== "object") {
    return null;
  }
  if (Object.keys(response).length === 0) {
    return null;
  }
  if (instanceOfInventory(response)) {
    return response;
  }
  if (instanceOfUpdateInventory(response) && response.inventory) {
    return response.inventory;
  }
  return null;
}

/** Parse inventory JSON from GET /groups/{id} or GET /inventory. */
export function parseInventoryFromJson(json: unknown): Inventory | null {
  return parseInventoryResponse(json);
}

/** Fetch inventory from GET /inventory (bypasses SDK response parsing bug). */
export async function fetchInventoryFromApi(
  basePath: string,
  options?: { groupId?: string },
): Promise<Inventory | null> {
  const url = new URL(`${basePath}/inventory`);
  if (options?.groupId) {
    url.searchParams.set("group_id", options.groupId);
  }

  const httpResponse = await fetch(url.toString(), { cache: "no-store" });
  if (!httpResponse.ok) {
    if (httpResponse.status === 404) {
      return null;
    }
    throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
  }

  const jsonData = await httpResponse.json();
  return parseInventoryResponse(jsonData);
}

function adjustVmsTotals(
  vms: VMs,
  totalDelta: number,
  migratableDelta: number,
): VMs {
  return {
    ...vms,
    total: Math.max(0, (vms.total ?? 0) + totalDelta),
    totalMigratable: Math.max(0, (vms.totalMigratable ?? 0) + migratableDelta),
  };
}

function cloneInventory(inventory: Inventory): Inventory {
  try {
    return structuredClone(inventory);
  } catch {
    return JSON.parse(JSON.stringify(inventory)) as Inventory;
  }
}

function findClusterKey(
  clusters: Inventory["clusters"] | undefined,
  clusterName: string,
): string | undefined {
  if (!clusters) {
    return undefined;
  }
  if (clusterName in clusters) {
    return clusterName;
  }
  const normalized = clusterName.toLowerCase();
  return Object.keys(clusters).find((key) => key.toLowerCase() === normalized);
}

/** Write aggregate VM totals to the inventory location the dashboard reads. */
function writeAggregateVms(inventory: Inventory, vms: VMs): Inventory {
  if (inventory.vcenter?.vms) {
    return {
      ...inventory,
      vcenter: {
        ...inventory.vcenter,
        vms,
      },
    };
  }

  const clusters = inventory.clusters ?? {};
  const keys = Object.keys(clusters);
  const clusterKey =
    keys.find((key) => clusters[key]?.infra && clusters[key]?.vms) ?? keys[0];
  if (!clusterKey || !clusters[clusterKey]?.vms) {
    return inventory;
  }

  return {
    ...inventory,
    clusters: {
      ...clusters,
      [clusterKey]: {
        ...clusters[clusterKey],
        vms,
      },
    },
  };
}

/**
 * Optimistically adjust VM totals after exclude/include from reports.
 * Keeps the assessment report in sync while the server recomputes inventory.
 */
export function adjustInventoryForMigrationExcludedChange(
  inventory: Inventory,
  vmIds: string[],
  excluded: boolean,
  knownVms: VirtualMachine[],
): Inventory {
  const sign = excluded ? -1 : 1;
  let totalDelta = 0;
  let migratableDelta = 0;
  const clusterDeltas = new Map<
    string,
    { total: number; migratable: number }
  >();

  for (const id of vmIds) {
    const vm = knownVms.find((candidate) => candidate.id === id);
    if (vm?.migrationExcluded === excluded) {
      continue;
    }

    totalDelta += sign;
    if (vm?.migratable) {
      migratableDelta += sign;
    }

    if (vm?.cluster) {
      const current = clusterDeltas.get(vm.cluster) ?? {
        total: 0,
        migratable: 0,
      };
      current.total += sign;
      if (vm.migratable) {
        current.migratable += sign;
      }
      clusterDeltas.set(vm.cluster, current);
    }
  }

  if (totalDelta === 0) {
    return inventory;
  }

  let next = cloneInventory(inventory);
  const aggregate = getInventoryAggregateView(next);
  const aggregateClusterKey = !next.vcenter?.vms
    ? (Object.keys(next.clusters ?? {}).find(
        (key) => next.clusters[key]?.infra && next.clusters[key]?.vms,
      ) ?? Object.keys(next.clusters ?? {})[0])
    : undefined;

  if (aggregate.vms) {
    next = writeAggregateVms(
      next,
      adjustVmsTotals(aggregate.vms, totalDelta, migratableDelta),
    );
  }

  for (const [clusterName, delta] of clusterDeltas) {
    const clusterKey = findClusterKey(next.clusters, clusterName);
    if (!clusterKey || !next.clusters?.[clusterKey]?.vms) {
      continue;
    }
    if (!next.vcenter?.vms && clusterKey === aggregateClusterKey) {
      continue;
    }
    next.clusters[clusterKey].vms = adjustVmsTotals(
      next.clusters[clusterKey].vms,
      delta.total,
      delta.migratable,
    );
  }

  return next;
}

function countMigrationExcludedDelta(
  change: MigrationExcludedInventoryChange,
): number {
  const sign = change.excluded ? -1 : 1;
  let count = 0;
  for (const id of change.vmIds) {
    const vm = change.affectedVms.find((candidate) => candidate.id === id);
    if (!vm || vm.migrationExcluded !== change.excluded) {
      count += 1;
    }
  }
  return count * sign;
}

function getExpectedInventoryTotal(
  previousTotal: number | undefined,
  change: MigrationExcludedInventoryChange,
): number | undefined {
  if (previousTotal === undefined) {
    return undefined;
  }
  const expectedDelta = countMigrationExcludedDelta(change);
  if (expectedDelta === 0) {
    return previousTotal;
  }
  return Math.max(0, previousTotal + expectedDelta);
}

/** Prefer server inventory when it reflects the change; otherwise keep optimistic state. */
export function resolveInventoryAfterMigrationChange(
  optimisticInventory: Inventory | null,
  fetchedInventory: Inventory | null,
  change: MigrationExcludedInventoryChange,
  previousTotal: number | undefined,
): Inventory | null {
  if (!fetchedInventory) {
    return optimisticInventory;
  }
  if (previousTotal === undefined) {
    return optimisticInventory ?? fetchedInventory;
  }

  const fetchedTotal = getInventoryAggregateView(fetchedInventory).vms?.total;
  const expectedDelta = countMigrationExcludedDelta(change);
  const expectedTotal = Math.max(0, previousTotal + expectedDelta);

  if (fetchedTotal === expectedTotal) {
    return fetchedInventory;
  }

  // Server inventory can lag behind VM updates; keep the optimistic totals.
  if (
    expectedDelta < 0 &&
    fetchedTotal !== undefined &&
    fetchedTotal >= previousTotal
  ) {
    return optimisticInventory;
  }
  if (
    expectedDelta > 0 &&
    fetchedTotal !== undefined &&
    fetchedTotal <= previousTotal
  ) {
    return optimisticInventory;
  }

  return fetchedInventory;
}

export async function fetchInventoryAfterMigrationChange(
  basePath: string,
  change: MigrationExcludedInventoryChange,
  previousTotal: number | undefined,
  optimisticInventory: Inventory | null,
  options?: { groupId?: string; maxAttempts?: number },
): Promise<Inventory | null> {
  const expectedTotal = getExpectedInventoryTotal(previousTotal, change);
  const maxAttempts = options?.maxAttempts ?? 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }

    const fetchedInventory = await fetchInventoryFromApi(basePath, options);
    const resolved = resolveInventoryAfterMigrationChange(
      optimisticInventory,
      fetchedInventory,
      change,
      previousTotal,
    );

    if (expectedTotal === undefined) {
      return resolved ?? optimisticInventory;
    }

    const resolvedTotal = getInventoryAggregateView(resolved).vms?.total;
    if (resolvedTotal === expectedTotal) {
      return resolved;
    }
  }

  return optimisticInventory;
}

export type InventoryAggregateView = {
  infra?: Infra;
  vms?: VMs;
  clusters: { [key: string]: InventoryData };
};

/** Aggregate infra/vms for the dashboard (vcenter scope, or cluster fallback). */
export function getInventoryAggregateView(
  inventory: Inventory | null,
): InventoryAggregateView {
  const clusters = inventory?.clusters ?? {};
  const vcenterInfra = inventory?.vcenter?.infra;
  const vcenterVms = inventory?.vcenter?.vms;

  // Prefer vcenter VM totals whenever present — this is what GET /inventory updates
  // and what writeAggregateVms writes to after exclude/include.
  if (vcenterVms) {
    return { infra: vcenterInfra, vms: vcenterVms, clusters };
  }

  const keys = Object.keys(clusters);
  if (keys.length > 0) {
    const clusterKey =
      keys.find((key) => clusters[key]?.infra && clusters[key]?.vms) ?? keys[0];
    const cluster = clusters[clusterKey];
    if (cluster?.infra && cluster?.vms) {
      return { infra: cluster.infra, vms: cluster.vms, clusters };
    }
  }

  return { infra: vcenterInfra, vms: vcenterVms, clusters };
}

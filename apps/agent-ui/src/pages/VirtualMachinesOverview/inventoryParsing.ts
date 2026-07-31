import type {
  Infra,
  Inventory,
  Inventory1,
  InventoryData,
  VirtualMachine,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Inventory1FromJSON,
  InventoryFromJSON,
  instanceOfInventory,
  instanceOfUpdateInventory,
  UpdateInventoryFromJSON,
} from "@openshift-migration-advisor/agent-sdk";
import type { DefaultApiInterface } from "../../common/agentApi";
import { getMigrationExcluded } from "./virtualMachineParsing";

/** vCenter/cluster inventory payload (nested inside GET /inventory wrapper). */
export type InventoryPayload = Inventory1;

export function unwrapInventoryPayload(
  inventory: Inventory | InventoryPayload | null | undefined,
): InventoryPayload | null {
  if (!inventory || typeof inventory !== "object") {
    return null;
  }
  if ("vcenter_id" in inventory && "clusters" in inventory) {
    return inventory as InventoryPayload;
  }
  if (instanceOfInventory(inventory)) {
    return inventory.inventory?.inventory ?? null;
  }
  if (
    typeof inventory === "object" &&
    "agentId" in inventory &&
    "inventory" in inventory &&
    instanceOfUpdateInventory(inventory as object)
  ) {
    return (inventory as { inventory?: InventoryPayload }).inventory ?? null;
  }
  return null;
}

export function wrapInventoryPayload(
  payload: InventoryPayload,
  agentId = "",
): Inventory {
  return {
    inventory: {
      agentId,
      inventory: payload,
    },
  };
}

export type MigrationExcludedInventoryChange = {
  vmIds: string[];
  excluded: boolean;
  affectedVms: VirtualMachine[];
};

/** Parse inventory from GET /inventory JSON (wrapper or legacy payload). */
export function parseInventoryResponse(
  jsonData: unknown,
): InventoryPayload | null {
  if (!jsonData || typeof jsonData !== "object") {
    return null;
  }
  const record = jsonData as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  if ("vcenter_id" in record && "clusters" in record) {
    return Inventory1FromJSON(jsonData);
  }
  if ("inventory" in record) {
    const parsed = InventoryFromJSON(jsonData);
    return unwrapInventoryPayload(parsed);
  }
  if ("agentId" in record && "inventory" in record) {
    const updateInventory = UpdateInventoryFromJSON(jsonData);
    return updateInventory.inventory ?? null;
  }
  return null;
}

/** Extract inventory payload from GET /inventory SDK response. */
export function inventoryFromGetInventoryResponse(
  response: Inventory | null | undefined,
): InventoryPayload | null {
  return unwrapInventoryPayload(response);
}

/** Parse inventory JSON from GET /groups/{id} or GET /inventory. */
export function parseInventoryFromJson(json: unknown): InventoryPayload | null {
  return parseInventoryResponse(json);
}

/** Extract group-scoped assessment inventory from a GroupResponse. */
export function inventoryFromGroupResponse(response: {
  inventory?: InventoryPayload | null;
}): InventoryPayload | null {
  return unwrapInventoryPayload(response.inventory);
}

/** Load group-scoped inventory from GET /groups/{groupId} (v2 GroupResponse.inventory). */
export async function fetchGroupAssessmentInventory(
  agentApi: DefaultApiInterface,
  groupId: string,
): Promise<InventoryPayload | null> {
  try {
    const response = await agentApi.getLatestGroup({
      groupId,
      page: 1,
      pageSize: 1,
    });
    return inventoryFromGroupResponse(response);
  } catch {
    return null;
  }
}

/** Fetch inventory from GET /inventory (bypasses SDK response parsing bug). */
export async function fetchInventoryFromApi(
  basePath: string,
): Promise<InventoryPayload | null> {
  const url = new URL(`${basePath}/inventory`);

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

function cloneInventory(inventory: InventoryPayload): InventoryPayload {
  try {
    return structuredClone(inventory);
  } catch {
    return JSON.parse(JSON.stringify(inventory)) as InventoryPayload;
  }
}

function findClusterKey(
  clusters: InventoryPayload["clusters"] | undefined,
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
function writeAggregateVms(
  inventory: InventoryPayload,
  vms: VMs,
): InventoryPayload {
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
  inventory: InventoryPayload,
  vmIds: string[],
  excluded: boolean,
  knownVms: VirtualMachine[],
): InventoryPayload {
  const sign = excluded ? -1 : 1;
  let totalDelta = 0;
  let migratableDelta = 0;
  const clusterDeltas = new Map<
    string,
    { total: number; migratable: number }
  >();

  for (const id of vmIds) {
    const vm = knownVms.find((candidate) => candidate.id === id);
    if (getMigrationExcluded(vm) === excluded) {
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
    if (!vm || getMigrationExcluded(vm) !== change.excluded) {
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
  optimisticInventory: InventoryPayload | null,
  fetchedInventory: InventoryPayload | null,
  change: MigrationExcludedInventoryChange,
  previousTotal: number | undefined,
): InventoryPayload | null {
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
  fetchInventory: () => Promise<InventoryPayload | null>,
  change: MigrationExcludedInventoryChange,
  previousTotal: number | undefined,
  optimisticInventory: InventoryPayload | null,
  options?: { maxAttempts?: number },
): Promise<InventoryPayload | null> {
  const expectedTotal = getExpectedInventoryTotal(previousTotal, change);
  const maxAttempts = options?.maxAttempts ?? 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }

    const fetchedInventory = await fetchInventory();
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
  inventory: InventoryPayload | Inventory | null,
): InventoryAggregateView {
  const payload = unwrapInventoryPayload(inventory);
  const clusters = payload?.clusters ?? {};
  const vcenterInfra = payload?.vcenter?.infra;
  const vcenterVms = payload?.vcenter?.vms;

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

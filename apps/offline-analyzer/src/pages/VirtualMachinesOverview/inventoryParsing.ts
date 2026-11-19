import type {
  CollectedInventory,
  Infra,
  InventoriesApiInterface,
  Inventory,
  InventoryData,
  IssuesBreakdown,
  MigrationIssue,
  SubResource,
  VirtualMachine,
  VMs,
} from "@openshift-migration-advisor/offline-analyzer-sdk";
import {
  InventoryFromJSON,
  ResponseError,
} from "@openshift-migration-advisor/offline-analyzer-sdk";
import { getMigrationExcluded } from "./virtualMachineParsing";

export type ReportInventoryResult = {
  inventory: Inventory | null;
  /** vCenter ids returned by the Offline Analyzer inventory endpoint. */
  vcenters: SubResource[];
};

export function unwrapInventoryPayload(inventory: unknown): Inventory | null {
  if (!inventory || typeof inventory !== "object") {
    return null;
  }
  const record = inventory as Record<string, unknown>;
  if ("vcenter_id" in record && "clusters" in record) {
    return record as unknown as Inventory;
  }
  if ("inventory" in record && record.inventory) {
    const nested = record.inventory;
    if (
      typeof nested === "object" &&
      "vcenter_id" in nested &&
      "clusters" in nested
    ) {
      return nested as Inventory;
    }
    if (
      typeof nested === "object" &&
      "inventory" in nested &&
      nested.inventory &&
      typeof nested.inventory === "object"
    ) {
      return nested.inventory as Inventory;
    }
  }
  return null;
}

/** Extract the group-scoped report inventory carried by GET /groups/{id}. */
export function inventoryFromGroupResponse(response: {
  inventory?: CollectedInventory | Inventory | null;
}): Inventory | null {
  return unwrapInventoryPayload(response.inventory);
}

export function wrapInventoryPayload(payload: Inventory): CollectedInventory {
  return { inventory: payload };
}

export type MigrationExcludedInventoryChange = {
  vmIds: string[];
  excluded: boolean;
  affectedVms: VirtualMachine[];
};

/** Parse inventory from a raw GET /inventory response or wrapped payload. */
export function parseInventoryResponse(jsonData: unknown): Inventory | null {
  if (!jsonData || typeof jsonData !== "object") {
    return null;
  }
  const record = jsonData as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  // Standalone analyzer: GET /inventory → { data, vcenters }
  if (
    "data" in record &&
    "vcenters" in record &&
    record.data &&
    typeof record.data === "object"
  ) {
    return InventoryFromJSON(record.data);
  }
  if ("vcenter_id" in record && "clusters" in record) {
    return InventoryFromJSON(jsonData);
  }
  if ("inventory" in record) {
    const inner = record.inventory;
    if (
      inner &&
      typeof inner === "object" &&
      "vcenter_id" in inner &&
      "clusters" in inner
    ) {
      return InventoryFromJSON(inner);
    }
    if (
      inner &&
      typeof inner === "object" &&
      "inventory" in inner &&
      inner.inventory &&
      typeof inner.inventory === "object"
    ) {
      return InventoryFromJSON(inner.inventory);
    }
    return null;
  }
  return null;
}

/** Extract inventory payload from GET /inventory SDK response. */
export function inventoryFromGetInventoryResponse(
  response: CollectedInventory | Inventory | null | undefined,
): Inventory | null {
  return unwrapInventoryPayload(response);
}

/** Parse inventory JSON from GET /inventory. */
export function parseInventoryFromJson(json: unknown): Inventory | null {
  return parseInventoryResponse(json);
}

function mergeNumberRecord(
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): Record<string, number> | undefined {
  const out: Record<string, number> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {})) {
    out[k] = (out[k] ?? 0) + v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeNumericMapsFromParts(
  parts: VMs[],
  pick: (v: VMs) => Record<string, number> | undefined,
): Record<string, number> | undefined {
  let acc: Record<string, number> | undefined;
  for (const v of parts) {
    const next = pick(v);
    if (!next || Object.keys(next).length === 0) {
      continue;
    }
    acc = mergeNumberRecord(acc, next);
  }
  return acc;
}

function sumVmResourceBreakdownField(
  parts: VMs[],
  pick: (v: VMs) => VMs["cpuCores"] | undefined,
): VMs["cpuCores"] {
  let total = 0;
  let totalForMigratable = 0;
  let totalForMigratableWithWarnings = 0;
  let totalForNotMigratable = 0;
  for (const vms of parts) {
    const br = pick(vms);
    if (!br) {
      continue;
    }
    total += br.total ?? 0;
    totalForMigratable += br.totalForMigratable ?? 0;
    totalForMigratableWithWarnings += br.totalForMigratableWithWarnings ?? 0;
    totalForNotMigratable += br.totalForNotMigratable ?? 0;
  }
  return {
    total,
    totalForMigratable,
    totalForMigratableWithWarnings,
    totalForNotMigratable,
  };
}

function mergeIssuesBreakdown(parts: VMs[]): IssuesBreakdown | undefined {
  let critical = 0;
  let warning = 0;
  let information = 0;
  let advisory = 0;
  let error = 0;
  let any = false;
  for (const vms of parts) {
    const ib = vms.issuesBreakdown;
    if (!ib) {
      continue;
    }
    any = true;
    critical += ib.critical ?? 0;
    warning += ib.warning ?? 0;
    information += ib.information ?? 0;
    advisory += ib.advisory ?? 0;
    error += ib.error ?? 0;
  }
  if (!any) {
    return undefined;
  }
  return { critical, warning, information, advisory, error };
}

function mergeMigrationIssues(
  lists: Array<MigrationIssue[] | undefined>,
): MigrationIssue[] {
  const byLabel = new Map<string, MigrationIssue>();
  for (const list of lists) {
    for (const issue of list ?? []) {
      const label = issue.label;
      const prev = byLabel.get(label);
      if (!prev) {
        byLabel.set(label, { ...issue, count: issue.count ?? 0 });
      } else {
        byLabel.set(label, {
          ...prev,
          count: (prev.count ?? 0) + (issue.count ?? 0),
        });
      }
    }
  }
  return [...byLabel.values()];
}

function mergeVmsSummaries(parts: VMs[]): VMs {
  const base = parts[0];
  if (!base) {
    throw new Error("mergeVmsSummaries requires at least one VMs object");
  }
  if (parts.length === 1) {
    return base;
  }

  let total = 0;
  let totalMigratable = 0;
  let totalMigratableWithWarnings = 0;
  let totalWithSharedDisks = 0;
  let totalWithRDM = 0;
  let totalWithFaultTolerance = 0;

  for (const v of parts) {
    total += v.total ?? 0;
    totalMigratable += v.totalMigratable ?? 0;
    totalMigratableWithWarnings += v.totalMigratableWithWarnings ?? 0;
    totalWithSharedDisks += v.totalWithSharedDisks ?? 0;
    totalWithRDM += v.totalWithRDM ?? 0;
    totalWithFaultTolerance += v.totalWithFaultTolerance ?? 0;
  }

  const cpuCores = sumVmResourceBreakdownField(parts, (v) => v.cpuCores);
  const ramGB = sumVmResourceBreakdownField(parts, (v) => v.ramGB);
  const diskGB = sumVmResourceBreakdownField(parts, (v) => v.diskGB);
  const diskCount = sumVmResourceBreakdownField(parts, (v) => v.diskCount);
  const nicCountMerged = parts.some((v) => v.nicCount)
    ? sumVmResourceBreakdownField(parts, (v) => v.nicCount)
    : undefined;

  const powerStates: Record<string, number> = {};
  for (const v of parts) {
    for (const [k, n] of Object.entries(v.powerStates ?? {})) {
      powerStates[k] = (powerStates[k] ?? 0) + n;
    }
  }

  const os = mergeNumericMapsFromParts(parts, (v) => v.os);

  const osInfoMerged = (() => {
    const byName = new Map<string, NonNullable<VMs["osInfo"]>[string]>();
    for (const v of parts) {
      for (const [name, info] of Object.entries(v.osInfo ?? {})) {
        const prev = byName.get(name);
        if (!prev) {
          byName.set(name, {
            ...info,
            count: info.count ?? 0,
          });
        } else {
          byName.set(name, {
            ...prev,
            count: (prev.count ?? 0) + (info.count ?? 0),
            supported: Boolean(prev.supported || info.supported),
            supportTier: prev.supportTier ?? info.supportTier,
            upgradeRecommendation:
              prev.upgradeRecommendation || info.upgradeRecommendation || "",
          });
        }
      }
    }
    const o = Object.fromEntries(byName);
    return Object.keys(o).length > 0 ? o : undefined;
  })();

  const distributionByCpuTier = mergeNumericMapsFromParts(
    parts,
    (v) => v.distributionByCpuTier,
  );
  const distributionByMemoryTier = mergeNumericMapsFromParts(
    parts,
    (v) => v.distributionByMemoryTier,
  );
  const distributionByNicCount = mergeNumericMapsFromParts(
    parts,
    (v) => v.distributionByNicCount,
  );

  const diskSizeTier: NonNullable<VMs["diskSizeTier"]> = {};
  for (const v of parts) {
    for (const [tier, sum] of Object.entries(v.diskSizeTier ?? {})) {
      const cur = diskSizeTier[tier];
      if (!cur) {
        diskSizeTier[tier] = {
          totalSizeTB: sum.totalSizeTB ?? 0,
          vmCount: sum.vmCount ?? 0,
        };
      } else {
        diskSizeTier[tier] = {
          totalSizeTB: (cur.totalSizeTB ?? 0) + (sum.totalSizeTB ?? 0),
          vmCount: (cur.vmCount ?? 0) + (sum.vmCount ?? 0),
        };
      }
    }
  }

  const diskComplexityTier: NonNullable<VMs["diskComplexityTier"]> = {};
  for (const v of parts) {
    for (const [tier, sum] of Object.entries(v.diskComplexityTier ?? {})) {
      const cur = diskComplexityTier[tier];
      if (!cur) {
        diskComplexityTier[tier] = {
          totalSizeTB: sum.totalSizeTB ?? 0,
          vmCount: sum.vmCount ?? 0,
        };
      } else {
        diskComplexityTier[tier] = {
          totalSizeTB: (cur.totalSizeTB ?? 0) + (sum.totalSizeTB ?? 0),
          vmCount: (cur.vmCount ?? 0) + (sum.vmCount ?? 0),
        };
      }
    }
  }

  const diskTypes: NonNullable<VMs["diskTypes"]> = {};
  for (const v of parts) {
    for (const [t, sum] of Object.entries(v.diskTypes ?? {})) {
      const cur = diskTypes[t];
      if (!cur) {
        diskTypes[t] = {
          vmCount: sum.vmCount ?? 0,
          totalSizeTB: sum.totalSizeTB ?? 0,
        };
      } else {
        diskTypes[t] = {
          vmCount: (cur.vmCount ?? 0) + (sum.vmCount ?? 0),
          totalSizeTB: (cur.totalSizeTB ?? 0) + (sum.totalSizeTB ?? 0),
        };
      }
    }
  }

  return {
    ...base,
    total,
    totalMigratable,
    totalMigratableWithWarnings,
    totalWithSharedDisks,
    totalWithRDM,
    totalWithFaultTolerance,
    cpuCores,
    ramGB,
    diskGB,
    diskCount,
    nicCount: nicCountMerged,
    powerStates,
    os: Object.keys(os ?? {}).length > 0 ? os : undefined,
    osInfo: osInfoMerged,
    distributionByCpuTier,
    distributionByMemoryTier,
    distributionByNicCount,
    diskSizeTier:
      Object.keys(diskSizeTier).length > 0 ? diskSizeTier : undefined,
    diskComplexityTier:
      Object.keys(diskComplexityTier).length > 0
        ? diskComplexityTier
        : undefined,
    diskTypes: Object.keys(diskTypes).length > 0 ? diskTypes : undefined,
    distributionByComplexity: mergeNumericMapsFromParts(
      parts,
      (v) => v.distributionByComplexity,
    ),
    complexityDistribution: (() => {
      const m: NonNullable<VMs["complexityDistribution"]> = {};
      for (const v of parts) {
        for (const [k, sum] of Object.entries(v.complexityDistribution ?? {})) {
          const cur = m[k];
          if (!cur) {
            m[k] = {
              totalSizeTB: sum.totalSizeTB ?? 0,
              vmCount: sum.vmCount ?? 0,
            };
          } else {
            m[k] = {
              totalSizeTB: (cur.totalSizeTB ?? 0) + (sum.totalSizeTB ?? 0),
              vmCount: (cur.vmCount ?? 0) + (sum.vmCount ?? 0),
            };
          }
        }
      }
      return Object.keys(m).length > 0 ? m : undefined;
    })(),
    notMigratableReasons: mergeMigrationIssues(
      parts.map((v) => v.notMigratableReasons),
    ),
    migrationWarnings: mergeMigrationIssues(
      parts.map((v) => v.migrationWarnings),
    ),
    issuesBreakdown: mergeIssuesBreakdown(parts),
  };
}

function mergeInfraParts(parts: Infra[]): Infra {
  if (parts.length === 0) {
    return {
      totalHosts: 0,
      hostPowerStates: {},
      networks: [],
      datastores: [],
    };
  }
  if (parts.length === 1) {
    return parts[0];
  }

  let totalHosts = 0;
  let totalDatacenters = 0;
  let totalClusters = 0;
  const hostPowerStates: Record<string, number> = {};
  const networks: Infra["networks"] = [];
  const datastores: Infra["datastores"] = [];
  const hosts: NonNullable<Infra["hosts"]> = [];
  const clustersPerDc: number[] = [];
  const hostsPerCluster: number[] = [];

  for (const inf of parts) {
    totalHosts += inf.totalHosts ?? 0;
    totalDatacenters += inf.totalDatacenters ?? 0;
    totalClusters += inf.totalClusters ?? 0;
    for (const [k, n] of Object.entries(inf.hostPowerStates ?? {})) {
      hostPowerStates[k] = (hostPowerStates[k] ?? 0) + n;
    }
    networks.push(...(inf.networks ?? []));
    datastores.push(...(inf.datastores ?? []));
    hosts.push(...(inf.hosts ?? []));
    if (inf.clustersPerDatacenter) {
      clustersPerDc.push(...inf.clustersPerDatacenter);
    }
    if (inf.hostsPerCluster) {
      hostsPerCluster.push(...inf.hostsPerCluster);
    }
  }

  return {
    ...parts[0],
    totalHosts,
    totalDatacenters: totalDatacenters > 0 ? totalDatacenters : undefined,
    totalClusters: totalClusters > 0 ? totalClusters : undefined,
    clustersPerDatacenter:
      clustersPerDc.length > 0 ? clustersPerDc : parts[0].clustersPerDatacenter,
    hostPowerStates,
    networks,
    datastores,
    hosts: hosts.length > 0 ? hosts : parts[0].hosts,
    hostsPerCluster:
      hostsPerCluster.length > 0 ? hostsPerCluster : parts[0].hostsPerCluster,
    cpuOverCommitment: undefined,
    memoryOverCommitment: undefined,
    vmsPerHostAverage: undefined,
  };
}

/** Distinct vCenter ids from a parsed inventory payload (agent `GET /inventory`). */
export function collectVcenterIdsFromInventoryPayload(
  payload: Inventory,
): string[] {
  const ids = new Set<string>();
  if (payload.vcenter_id?.trim()) {
    ids.add(payload.vcenter_id.trim());
  }
  for (const cluster of Object.values(payload.clusters ?? {})) {
    const id = cluster?.vcenter?.id?.trim();
    if (id) {
      ids.add(id);
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

function filterInventoryPayloadByVcenterId(
  payload: Inventory,
  vcenterId: string,
): Inventory {
  const clusters = payload.clusters ?? {};
  const matching: [string, InventoryData][] = [];
  for (const [name, data] of Object.entries(clusters)) {
    const cid = data?.vcenter?.id?.trim();
    if (cid && cid === vcenterId) {
      matching.push([name, data]);
    }
  }

  if (matching.length === 0 && payload.vcenter_id === vcenterId) {
    return payload;
  }

  if (matching.length === 0) {
    return {
      ...payload,
      clusters: {},
      vcenter: undefined,
    };
  }

  if (matching.length === 1) {
    const [onlyName, onlyData] = matching[0];
    return {
      ...payload,
      vcenter_id: vcenterId,
      clusters: { [onlyName]: onlyData },
      vcenter: onlyData,
    };
  }

  const mergedClusters = Object.fromEntries(matching);
  const mergedVms = mergeVmsSummaries(matching.map(([, d]) => d.vms));
  const mergedInfra = mergeInfraParts(
    matching.map(([, d]) => d.infra).filter(Boolean) as Infra[],
  );

  return {
    ...payload,
    vcenter_id: vcenterId,
    clusters: mergedClusters,
    vcenter: {
      ...matching[0][1],
      infra: mergedInfra,
      vms: mergedVms,
    },
  };
}

function inventoryWithVcenterScopeFromParsed(
  parsed: Inventory | null,
  selectedVcenterId: string | undefined,
): { inventory: Inventory | null; vcenters: SubResource[] } {
  if (!parsed) {
    return { inventory: null, vcenters: [] };
  }

  const allIds = collectVcenterIdsFromInventoryPayload(parsed);
  const vcenters = allIds.map((id) => ({ id }));

  const wantAll = !selectedVcenterId || selectedVcenterId === "all";
  if (wantAll || allIds.length <= 1) {
    return { inventory: parsed, vcenters };
  }

  if (!allIds.includes(selectedVcenterId)) {
    return { inventory: parsed, vcenters };
  }

  return {
    inventory: filterInventoryPayloadByVcenterId(parsed, selectedVcenterId),
    vcenters,
  };
}

/**
 * Load the latest inventory through the Offline Analyzer SDK. A selected vCenter is
 * fetched directly when the SDK's inventory response lists it; otherwise the aggregate
 * inventory is retained and scoped locally when possible.
 */
export async function fetchReportInventoryFromApi(
  api: Pick<
    InventoriesApiInterface,
    "getLatestInventory" | "getLatestVcenterInventory"
  >,
  selectedVcenterId?: string,
): Promise<ReportInventoryResult> {
  let response: Awaited<ReturnType<typeof api.getLatestInventory>>;
  try {
    response = await api.getLatestInventory({});
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return { inventory: null, vcenters: [] };
    }
    throw error;
  }

  const inventory = response.data ?? null;
  const listVcenters = response.vcenters ?? [];
  const vid = selectedVcenterId;
  if (
    listVcenters.length > 1 &&
    vid &&
    vid !== "all" &&
    listVcenters.some((v) => v.id === vid)
  ) {
    try {
      const vcResponse = await api.getLatestVcenterInventory({ vid });
      return {
        inventory: inventoryFromGetInventoryResponse(vcResponse),
        vcenters: listVcenters,
      };
    } catch (error) {
      if (!(error instanceof ResponseError) || error.response.status !== 404) {
        throw error;
      }
    }
  }

  const scoped = inventoryWithVcenterScopeFromParsed(
    inventory,
    selectedVcenterId,
  );
  return {
    inventory: scoped.inventory,
    vcenters: listVcenters.length > 0 ? listVcenters : scoped.vcenters,
  };
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

export type InventoryAggregateView = {
  infra?: Infra;
  vms?: VMs;
  clusters: { [key: string]: InventoryData };
};

/** Aggregate infra/vms for the dashboard (vcenter scope, or cluster fallback). */
export function getInventoryAggregateView(
  inventory: Inventory | null,
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

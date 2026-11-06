import type {
  Infra,
  Inventory,
  Inventory1,
  InventoryData,
  IssuesBreakdown,
  MigrationIssue,
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
import type { DefaultApiInterface } from "../../api/agentApi";
import { getMigrationExcluded } from "./virtualMachineParsing";

/** vCenter/cluster inventory payload (nested inside GET /inventory wrapper). */
export type InventoryPayload = Inventory1;

/** Sub-resource reference (`AssessmentV2.vcenters` in the Migration Advisor API). */
export type AssessmentSubResource = { id: string };

export type ReportInventoryResult = {
  inventory: InventoryPayload | null;
  /**
   * Distinct vCenter ids for the dropdown: `GET /assessments` (`AssessmentV2.vcenters`),
   * standalone analyzer `GET /inventory` (`InventoryResponse.vcenters`), or derived from
   * legacy agent `GET /inventory` (`vcenter_id` and per-cluster `vcenter.id`).
   */
  vcenters: AssessmentSubResource[];
  /** Present when the assessment API was used; omitted for legacy `GET /inventory` only. */
  assessmentId: string | null;
};

function parseOptionalDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Maps `InventoryV2` (assessment API) into the dashboard's `Inventory1` shape.
 * @see openapi AssessmentV2 / AssessmentVCenterV2
 */
export function inventoryPayloadFromInventoryV2(
  raw: unknown,
): InventoryPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = record.id;
  const data = record.data;
  if (typeof id !== "string" || !data || typeof data !== "object") {
    return null;
  }
  const dataObj = data as InventoryData;
  return {
    vcenter_id: id,
    clusters: {},
    vcenter: dataObj,
    vcenter_version:
      typeof record.vcenter_version === "string"
        ? record.vcenter_version
        : undefined,
    created_at: parseOptionalDate(record.created_at),
  };
}

function parseVcentersList(raw: unknown): AssessmentSubResource[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: AssessmentSubResource[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string"
    ) {
      out.push({ id: (item as { id: string }).id });
    }
  }
  return out;
}

type AssessmentListEntry = { id: string; createdAt?: string };

function pickNewestAssessment(
  entries: AssessmentListEntry[],
): string | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  const sorted = [...entries].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta || a.id.localeCompare(b.id);
  });
  return sorted[0]?.id;
}

async function fetchJsonAllow404(url: string): Promise<unknown | null> {
  const httpResponse = await fetch(url, { cache: "no-store" });
  if (httpResponse.status === 404) {
    return null;
  }
  if (!httpResponse.ok) {
    throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
  }
  return httpResponse.json() as Promise<unknown>;
}

async function tryFetchAssessmentInventory(
  basePath: string,
  selectedVcenterId: string | undefined,
): Promise<ReportInventoryResult | null> {
  const listJson = await fetchJsonAllow404(`${basePath}/assessments`);
  if (listJson === null) {
    return null;
  }
  if (!Array.isArray(listJson) || listJson.length === 0) {
    return null;
  }

  const entries: AssessmentListEntry[] = listJson
    .filter(
      (e): e is Record<string, unknown> =>
        Boolean(e) &&
        typeof e === "object" &&
        typeof (e as { id?: unknown }).id === "string",
    )
    .map((e) => ({
      id: e.id as string,
      createdAt:
        typeof e.createdAt === "string"
          ? e.createdAt
          : typeof (e as { created_at?: unknown }).created_at === "string"
            ? (e as { created_at: string }).created_at
            : undefined,
    }));

  const assessmentId = pickNewestAssessment(entries);
  if (!assessmentId) {
    return null;
  }

  const summaryJson = await fetchJsonAllow404(
    `${basePath}/assessments/${assessmentId}`,
  );
  if (summaryJson === null || typeof summaryJson !== "object") {
    return null;
  }
  const summary = summaryJson as Record<string, unknown>;
  const vcenters = parseVcentersList(summary.vcenters);

  const wantAll = !selectedVcenterId || selectedVcenterId === "all";

  if (wantAll) {
    const inv = inventoryPayloadFromInventoryV2(summary.data);
    return { inventory: inv, vcenters, assessmentId };
  }

  const vid = selectedVcenterId;
  if (!vcenters.some((v) => v.id === vid)) {
    const merged = inventoryPayloadFromInventoryV2(summary.data);
    return { inventory: merged, vcenters, assessmentId };
  }

  const vcJson = await fetchJsonAllow404(
    `${basePath}/assessments/${assessmentId}/vcenters/${vid}`,
  );
  if (vcJson === null || typeof vcJson !== "object") {
    const merged = inventoryPayloadFromInventoryV2(summary.data);
    return { inventory: merged, vcenters, assessmentId };
  }
  const vcRecord = vcJson as Record<string, unknown>;
  const inv = inventoryPayloadFromInventoryV2(vcRecord.data);
  return { inventory: inv, vcenters, assessmentId };
}

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

/**
 * vCenter ids from standalone RVTools analyzer `GET /inventory`
 * (`InventoryResponse.vcenters`), when present.
 */
function parseInventoryVcentersFromJson(
  jsonData: unknown,
): AssessmentSubResource[] | null {
  if (!jsonData || typeof jsonData !== "object") {
    return null;
  }
  const record = jsonData as Record<string, unknown>;
  if (!("data" in record) || !("vcenters" in record)) {
    return null;
  }
  const parsed = parseVcentersList(record.vcenters);
  return parsed.length > 0 ? parsed : null;
}

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
  // Standalone analyzer: GET /inventory → { data, vcenters }
  if (
    "data" in record &&
    "vcenters" in record &&
    record.data &&
    typeof record.data === "object"
  ) {
    return Inventory1FromJSON(record.data);
  }
  if ("vcenter_id" in record && "clusters" in record) {
    return Inventory1FromJSON(jsonData);
  }
  if ("inventory" in record) {
    const inner = record.inventory;
    if (
      inner &&
      typeof inner === "object" &&
      "vcenter_id" in inner &&
      "clusters" in inner
    ) {
      return Inventory1FromJSON(inner);
    }
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
  payload: InventoryPayload,
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
  payload: InventoryPayload,
  vcenterId: string,
): InventoryPayload {
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
  parsed: InventoryPayload | null,
  selectedVcenterId: string | undefined,
): { inventory: InventoryPayload | null; vcenters: AssessmentSubResource[] } {
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
 * Latest report inventory: prefers `GET /assessments` when available (SaaS assessment API),
 * otherwise `GET /inventory` (agent appliance or standalone analyzer).
 *
 * Standalone analyzer (OpenAPI `getLatestInventory` / `getLatestVcenterInventory`): list comes
 * from `InventoryResponse.vcenters`; a specific vCenter uses `GET /inventory/vcenters/{vid}`.
 */
export async function fetchReportInventoryFromApi(
  basePath: string,
  selectedVcenterId?: string,
): Promise<ReportInventoryResult> {
  const assessment = await tryFetchAssessmentInventory(
    basePath,
    selectedVcenterId,
  );
  if (assessment) {
    return assessment;
  }

  const url = new URL(`${basePath}/inventory`);
  const httpResponse = await fetch(url.toString(), { cache: "no-store" });
  if (!httpResponse.ok) {
    if (httpResponse.status === 404) {
      return { inventory: null, vcenters: [], assessmentId: null };
    }
    throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
  }

  const jsonData = await httpResponse.json();
  const parsed = parseInventoryResponse(jsonData);
  const listVcenters = parseInventoryVcentersFromJson(jsonData);

  const vid = selectedVcenterId;
  if (
    listVcenters &&
    listVcenters.length > 1 &&
    vid &&
    vid !== "all" &&
    listVcenters.some((v) => v.id === vid)
  ) {
    const vcUrl = `${basePath}/inventory/vcenters/${encodeURIComponent(vid)}`;
    const vcResponse = await fetch(vcUrl, { cache: "no-store" });
    if (vcResponse.ok) {
      const vcJson = await vcResponse.json();
      return {
        inventory: parseInventoryResponse(vcJson),
        vcenters: listVcenters,
        assessmentId: null,
      };
    }
  }

  const scoped = inventoryWithVcenterScopeFromParsed(parsed, selectedVcenterId);
  return {
    inventory: scoped.inventory,
    vcenters:
      listVcenters && listVcenters.length > 0 ? listVcenters : scoped.vcenters,
    assessmentId: null,
  };
}

/** @deprecated Prefer `fetchReportInventoryFromApi` for full metadata. */
export async function fetchInventoryFromApi(
  basePath: string,
): Promise<InventoryPayload | null> {
  const { inventory } = await fetchReportInventoryFromApi(basePath);
  return inventory;
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

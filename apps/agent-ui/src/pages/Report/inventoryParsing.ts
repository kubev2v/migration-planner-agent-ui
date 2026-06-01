import type {
  Infra,
  Inventory,
  InventoryData,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import { InventoryFromJSON } from "@openshift-migration-advisor/agent-sdk";

/** Parse inventory JSON from GET /groups/{id} or GET /inventory. */
export function parseInventoryFromJson(json: unknown): Inventory | null {
  if (!json || typeof json !== "object") {
    return null;
  }
  const record = json as Record<string, unknown>;
  if (Object.keys(record).length === 0) {
    return null;
  }
  if ("vcenter_id" in record && "clusters" in record) {
    return InventoryFromJSON(json);
  }
  return null;
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

  if (vcenterInfra && vcenterVms) {
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

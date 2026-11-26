export const NETWORK_INVENTORY_NOT_AVAILABLE = "Not available";

/** Row source shape from inventory `infra.networks` (SDK-agnostic). */
export type InventoryNetworkRowLike = {
  name: string;
  type?: string;
  vlanId?: string;
  vmsCount?: number;
  dvswitch?: string;
};

export type NetworkingInventorySummary = {
  networks: number;
  vlansAndRanges: number;
  distributedNetworks: number;
  standardNetworks: number;
};

export type NetworkingInventoryTableRow = {
  id: string;
  name: string;
  typeLabel: string;
  vlanLabel: string;
  connectedVmsLabel: string;
  distributedSwitchLabel: string;
  scopeLabel: string;
};

const normalizeType = (type?: string): string =>
  typeof type === "string" ? type.trim().toLowerCase() : "";

export const formatNetworkTypeLabel = (type?: string): string => {
  const normalized = normalizeType(type);
  if (normalized === "standard") {
    return "Standard";
  }
  if (normalized === "distributed" || normalized === "dvswitch") {
    return "Distributed";
  }
  if (normalized === "unsupported") {
    return "Unsupported";
  }
  if (normalized === "") {
    return NETWORK_INVENTORY_NOT_AVAILABLE;
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const formatOptionalVlan = (vlanId?: string): string => {
  const value = vlanId?.trim();
  return value ? value : NETWORK_INVENTORY_NOT_AVAILABLE;
};

export const formatOptionalText = (value?: string): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : NETWORK_INVENTORY_NOT_AVAILABLE;
};

export const formatConnectedVms = (vmsCount?: number): string => {
  if (
    typeof vmsCount === "number" &&
    Number.isFinite(vmsCount) &&
    vmsCount >= 0
  ) {
    return String(vmsCount);
  }
  return NETWORK_INVENTORY_NOT_AVAILABLE;
};

export function buildNetworkingInventorySummary(
  networks: InventoryNetworkRowLike[] | undefined,
): NetworkingInventorySummary {
  const items = Array.isArray(networks) ? networks : [];
  const vlanKeys = new Set<string>();
  let distributed = 0;
  let standard = 0;

  for (const network of items) {
    const normalized = normalizeType(network.type);
    if (normalized === "standard") {
      standard += 1;
    } else if (normalized === "distributed" || normalized === "dvswitch") {
      distributed += 1;
    }
    const vlan = network.vlanId?.trim();
    if (vlan) {
      vlanKeys.add(vlan);
    }
  }

  return {
    networks: items.length,
    vlansAndRanges: vlanKeys.size,
    distributedNetworks: distributed,
    standardNetworks: standard,
  };
}

export function buildNetworkingInventoryTableRows(
  networks: InventoryNetworkRowLike[] | undefined,
  scopeLabel: string,
): NetworkingInventoryTableRow[] {
  const items = Array.isArray(networks) ? networks : [];
  const scope = scopeLabel.trim() || NETWORK_INVENTORY_NOT_AVAILABLE;

  return items.map((network, index) => {
    const name = network.name?.trim() || NETWORK_INVENTORY_NOT_AVAILABLE;
    return {
      id: `${name}-${index}`,
      name,
      typeLabel: formatNetworkTypeLabel(network.type),
      vlanLabel: formatOptionalVlan(network.vlanId),
      connectedVmsLabel: formatConnectedVms(network.vmsCount),
      distributedSwitchLabel: formatOptionalText(network.dvswitch),
      scopeLabel: scope,
    };
  });
}

export function filterNetworkingRowsBySearch(
  rows: NetworkingInventoryTableRow[],
  search: string,
): NetworkingInventoryTableRow[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return rows;
  }
  return rows.filter((row) => row.name.toLowerCase().includes(query));
}

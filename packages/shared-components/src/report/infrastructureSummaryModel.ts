export type FeatureStatus = "enabled" | "disabled" | "unknown";

export type HostCapability = "vmotionSupported" | "storageVmotionSupported";

export type InventoryHost = {
  vmotionSupported?: boolean;
  storageVmotionSupported?: boolean;
};

export type InventoryDatastore = {
  type?: string;
};

export type InventoryNetwork = {
  name: string;
  type?: string;
  vlanId?: string;
};

export type InventoryInfra = {
  totalHosts?: number;
  totalDatacenters?: number;
  hosts?: InventoryHost[];
  clustersPerDatacenter?: number[];
  networks?: InventoryNetwork[];
  datastores?: InventoryDatastore[];
};

export type InventoryVms = {
  total?: number;
  diskTypes?: Record<string, unknown>;
};

export type InventoryCluster = {
  infra?: InventoryInfra;
  vms?: InventoryVms;
  vcenter?: { id?: string };
  clusterFeatures?: {
    drsEnabled?: boolean;
    haEnabled?: boolean;
  };
};

export type InfrastructureSummaryModel = {
  vmwareVersion: string;
  datacenters: number | undefined;
  vCenters: number | undefined;
  esxiHosts: number | undefined;
};

export type NetworkLabel = {
  name: string;
  vlanId?: string;
  displayName: string;
};

export type ClusterDetailRow = {
  id: string;
  name: string;
  hosts: number;
  vms: number;
  vmotion: FeatureStatus;
  drs: FeatureStatus;
  vsan: FeatureStatus;
};

export type ClusterDetailsModel = {
  hosts: number;
  vms: number;
  networksDetected: number;
  vmotion: FeatureStatus;
  drs: FeatureStatus;
  ha: FeatureStatus;
  vsan: FeatureStatus;
  networks: NetworkLabel[];
};

const VSAN_TYPE_PATTERN = /vsan/i;

export const formatVSphereVersion = (version?: string): string => {
  if (!version?.trim()) {
    return "—";
  }

  const withoutPrefix = version.trim().replace(/^vSphere\s+/i, "");
  const parts = withoutPrefix.split(".");
  while (parts.length > 3 && parts[parts.length - 1] === "0") {
    parts.pop();
  }

  return `vSphere ${parts.join(".")}`;
};

export const booleanToFeatureStatus = (
  value: boolean | undefined,
): FeatureStatus => {
  if (value === true) {
    return "enabled";
  }
  if (value === false) {
    return "disabled";
  }
  return "unknown";
};

export const hostCapabilityStatus = (
  hosts: InventoryHost[] | undefined,
  capability: HostCapability,
): FeatureStatus => {
  if (!hosts || hosts.length === 0) {
    return "unknown";
  }

  const known = hosts
    .map((host) => host[capability])
    .filter((value): value is boolean => typeof value === "boolean");

  if (known.length === 0) {
    return "unknown";
  }

  return known.some(Boolean) ? "enabled" : "disabled";
};

export const vsanStatus = (
  infra?: InventoryInfra,
  vms?: InventoryVms,
): FeatureStatus => {
  const datastoreMatch = infra?.datastores?.some((datastore) =>
    VSAN_TYPE_PATTERN.test(datastore.type ?? ""),
  );
  const diskTypeMatch = Object.keys(vms?.diskTypes ?? {}).some((type) =>
    VSAN_TYPE_PATTERN.test(type),
  );

  if (datastoreMatch || diskTypeMatch) {
    return "enabled";
  }

  if (infra?.datastores || vms?.diskTypes) {
    return "disabled";
  }

  return "unknown";
};

const hostCount = (infra?: InventoryInfra): number | undefined => {
  if (typeof infra?.totalHosts === "number") {
    return infra.totalHosts;
  }
  if (infra?.hosts) {
    return infra.hosts.length;
  }
  return undefined;
};

const datacenterCount = (infra?: InventoryInfra): number | undefined => {
  if (typeof infra?.totalDatacenters === "number") {
    return infra.totalDatacenters;
  }
  if (infra?.clustersPerDatacenter && infra.clustersPerDatacenter.length > 0) {
    return infra.clustersPerDatacenter.length;
  }
  return undefined;
};

export const countVCenters = (
  clusters?: Record<string, InventoryCluster>,
  vcenterId?: string,
): number | undefined => {
  const ids = new Set<string>();
  if (vcenterId) {
    ids.add(vcenterId);
  }
  for (const cluster of Object.values(clusters ?? {})) {
    if (cluster.vcenter?.id) {
      ids.add(cluster.vcenter.id);
    }
  }
  return ids.size > 0 ? ids.size : undefined;
};

const toNetworkLabel = (network: InventoryNetwork): NetworkLabel => {
  const vlanId = network.vlanId?.trim();
  return {
    name: network.name,
    vlanId: vlanId || undefined,
    displayName: vlanId ? `${network.name} (VLAN ${vlanId})` : network.name,
  };
};

export const visibleNetworks = (infra?: InventoryInfra): NetworkLabel[] =>
  (infra?.networks ?? [])
    .filter(
      (network) => Boolean(network.name?.trim()) && network.type !== "dvswitch",
    )
    .map(toNetworkLabel);

export const buildInfrastructureSummary = ({
  infra,
  vcenterVersion,
  vcenterId,
  clusters,
}: {
  infra?: InventoryInfra;
  vcenterVersion?: string;
  vcenterId?: string;
  clusters?: Record<string, InventoryCluster>;
}): InfrastructureSummaryModel => ({
  vmwareVersion: formatVSphereVersion(vcenterVersion),
  datacenters: datacenterCount(infra),
  vCenters: countVCenters(clusters, vcenterId),
  esxiHosts: hostCount(infra),
});

const clusterFeatureStatus = (
  cluster: InventoryCluster,
): Pick<ClusterDetailRow, "vmotion" | "drs" | "vsan"> & {
  ha: FeatureStatus;
} => ({
  vmotion: hostCapabilityStatus(cluster.infra?.hosts, "vmotionSupported"),
  drs: booleanToFeatureStatus(cluster.clusterFeatures?.drsEnabled),
  ha: booleanToFeatureStatus(cluster.clusterFeatures?.haEnabled),
  vsan: vsanStatus(cluster.infra, cluster.vms),
});

const compareClustersByVmCount = (
  a: string,
  b: string,
  clusters: Record<string, InventoryCluster>,
): number => {
  const vmsA = clusters[a]?.vms?.total ?? 0;
  const vmsB = clusters[b]?.vms?.total ?? 0;
  return vmsB - vmsA || a.localeCompare(b);
};

export const buildClusterDetailRows = (
  clusters?: Record<string, InventoryCluster>,
): ClusterDetailRow[] => {
  if (!clusters) {
    return [];
  }

  return Object.keys(clusters)
    .sort((a, b) => compareClustersByVmCount(a, b, clusters))
    .map((id) => {
      const cluster = clusters[id];
      const features = clusterFeatureStatus(cluster);
      return {
        id,
        name: id,
        hosts: hostCount(cluster.infra) ?? 0,
        vms: cluster.vms?.total ?? 0,
        vmotion: features.vmotion,
        drs: features.drs,
        vsan: features.vsan,
      };
    });
};

export const buildClusterDetails = (
  cluster?: InventoryCluster,
): ClusterDetailsModel | undefined => {
  if (!cluster) {
    return undefined;
  }

  const networks = visibleNetworks(cluster.infra);
  const features = clusterFeatureStatus(cluster);

  return {
    hosts: hostCount(cluster.infra) ?? 0,
    vms: cluster.vms?.total ?? 0,
    networksDetected: networks.length,
    vmotion: features.vmotion,
    drs: features.drs,
    ha: features.ha,
    vsan: features.vsan,
    networks,
  };
};

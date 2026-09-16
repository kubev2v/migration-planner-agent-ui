import { describe, expect, it } from "vitest";
import {
  booleanToFeatureStatus,
  buildClusterDetailRows,
  buildClusterDetails,
  buildInfrastructureSummary,
  countVCenters,
  formatVSphereVersion,
  hostCapabilityStatus,
  type InventoryCluster,
  type InventoryHost,
  type InventoryInfra,
  visibleNetworks,
  vsanStatus,
} from "../infrastructureSummaryModel.js";

const createInfra = (
  overrides: Partial<InventoryInfra> = {},
): InventoryInfra => ({
  totalHosts: 0,
  networks: [],
  datastores: [],
  ...overrides,
});

describe("formatVSphereVersion", () => {
  it("formats API versions as vSphere labels and drops trailing build zeros", () => {
    expect(formatVSphereVersion("7.0.3.0")).toBe("vSphere 7.0.3");
    expect(formatVSphereVersion("8.0.3.0")).toBe("vSphere 8.0.3");
  });

  it("keeps an existing vSphere prefix and missing values", () => {
    expect(formatVSphereVersion("vSphere 7.0.3")).toBe("vSphere 7.0.3");
    expect(formatVSphereVersion(undefined)).toBe("—");
    expect(formatVSphereVersion("")).toBe("—");
  });
});

describe("feature status helpers", () => {
  it("maps booleans to enabled, disabled, or unknown", () => {
    expect(booleanToFeatureStatus(true)).toBe("enabled");
    expect(booleanToFeatureStatus(false)).toBe("disabled");
    expect(booleanToFeatureStatus(undefined)).toBe("unknown");
  });

  it("treats vMotion as enabled when any host supports it", () => {
    const hosts: InventoryHost[] = [
      { vmotionSupported: false },
      { vmotionSupported: true },
    ];
    expect(hostCapabilityStatus(hosts, "vmotionSupported")).toBe("enabled");
  });

  it("treats vMotion as disabled when every known host reports false", () => {
    const hosts: InventoryHost[] = [
      { vmotionSupported: false },
      { vmotionSupported: false },
    ];
    expect(hostCapabilityStatus(hosts, "vmotionSupported")).toBe("disabled");
  });

  it("treats missing host capability flags as unknown", () => {
    expect(hostCapabilityStatus([{}], "vmotionSupported")).toBe("unknown");
    expect(hostCapabilityStatus([], "vmotionSupported")).toBe("unknown");
  });

  it("detects vSAN from datastore type or disk type", () => {
    expect(
      vsanStatus(
        createInfra({
          datastores: [{ type: "vSAN" }],
        }),
      ),
    ).toBe("enabled");
    expect(
      vsanStatus(createInfra(), { total: 10, diskTypes: { vSAN: {} } }),
    ).toBe("enabled");
    expect(vsanStatus(createInfra({ datastores: [] }))).toBe("disabled");
    expect(vsanStatus()).toBe("unknown");
  });
});

describe("buildInfrastructureSummary", () => {
  it("maps inventory metadata into the summary card model", () => {
    const summary = buildInfrastructureSummary({
      infra: createInfra({
        totalHosts: 12,
        totalDatacenters: 1,
      }),
      vcenterVersion: "7.0.3.0",
      vcenterId: "vc-1",
      clusters: {},
    });

    expect(summary).toEqual({
      vmwareVersion: "vSphere 7.0.3",
      datacenters: 1,
      vCenters: 1,
      esxiHosts: 12,
    });
  });

  it("falls back to clustersPerDatacenter length and unique vCenter ids", () => {
    const summary = buildInfrastructureSummary({
      infra: createInfra({
        totalHosts: 7,
        clustersPerDatacenter: [1, 1],
      }),
      clusters: {
        A: {
          infra: createInfra(),
          vms: { total: 1 },
          vcenter: { id: "vc-a" },
        },
        B: {
          infra: createInfra(),
          vms: { total: 1 },
          vcenter: { id: "vc-b" },
        },
      },
    });

    expect(summary.datacenters).toBe(2);
    expect(summary.vCenters).toBe(2);
  });
});

describe("countVCenters", () => {
  it("returns undefined when no vCenter identity is present", () => {
    expect(countVCenters(undefined, undefined)).toBeUndefined();
  });
});

describe("cluster details", () => {
  it("builds sorted aggregate rows from cluster features", () => {
    const clusters: Record<string, InventoryCluster> = {
      "Cluster-Dev-02": {
        infra: createInfra({
          totalHosts: 7,
          hosts: [{ vmotionSupported: true }],
          datastores: [],
        }),
        vms: { total: 350 },
        clusterFeatures: { drsEnabled: false, haEnabled: true },
      },
      "Cluster-Prod-01": {
        infra: createInfra({
          totalHosts: 5,
          hosts: [{ vmotionSupported: true }],
          datastores: [{ type: "vSAN" }],
        }),
        vms: { total: 280 },
        clusterFeatures: { drsEnabled: true, haEnabled: true },
      },
    };

    const rows = buildClusterDetailRows(clusters);
    expect(rows.map((row) => row.name)).toEqual([
      "Cluster-Dev-02",
      "Cluster-Prod-01",
    ]);
    expect(rows[0]).toMatchObject({
      hosts: 7,
      vms: 350,
      vmotion: "enabled",
      drs: "disabled",
      vsan: "disabled",
    });
    expect(rows[1]).toMatchObject({
      hosts: 5,
      vms: 280,
      drs: "enabled",
      vsan: "enabled",
    });
  });

  it("builds the detailed cluster model including HA and network labels", () => {
    const details = buildClusterDetails({
      infra: createInfra({
        totalHosts: 7,
        hosts: [{ vmotionSupported: true }],
        networks: [
          { type: "distributed", name: "VDS-Dev", vlanId: "10" },
          { type: "distributed", name: "VDS-Dev", vlanId: "11" },
          { type: "dvswitch", name: "vDSwitch0" },
        ],
      }),
      vms: { total: 350 },
      clusterFeatures: { drsEnabled: false, haEnabled: true },
    });

    expect(details).toMatchObject({
      hosts: 7,
      vms: 350,
      networksDetected: 2,
      vmotion: "enabled",
      drs: "disabled",
      ha: "enabled",
      vsan: "disabled",
    });
    expect(details?.networks.map((network) => network.displayName)).toEqual([
      "VDS-Dev (VLAN 10)",
      "VDS-Dev (VLAN 11)",
    ]);
  });
});

describe("visibleNetworks", () => {
  it("omits unnamed networks and dvswitches", () => {
    expect(
      visibleNetworks(
        createInfra({
          networks: [
            { type: "distributed", name: "  " },
            { type: "dvswitch", name: "switch" },
            { type: "standard", name: "VM Network" },
          ],
        }),
      ),
    ).toEqual([
      { name: "VM Network", vlanId: undefined, displayName: "VM Network" },
    ]);
  });
});

import type { VirtualMachine } from "@openshift-migration-advisor/offline-analyzer-sdk";
import { describe, expect, it } from "vitest";
import {
  getMigrationExcluded,
  getVmTags,
  getVmVSphereAnnotation,
  getVmVSphereTags,
  normalizeVirtualMachine,
  virtualMachineDetailFromJson,
  virtualMachineFromListJson,
} from "./virtualMachineParsing";

const baseVm: VirtualMachine = {
  id: "vm-1",
  name: "vm-1",
  vCenterID: "vc-1",
  vCenterState: "poweredOn",
  cluster: "c1",
  datacenter: "dc1",
  diskSize: 1,
  memory: 1,
  issueCount: 0,
};

describe("normalizeVirtualMachine", () => {
  it("maps snake_case migration_excluded to migrationExcluded", () => {
    const normalized = normalizeVirtualMachine({
      ...baseVm,
      migration_excluded: true,
    } as VirtualMachine & { migration_excluded?: boolean });

    expect(getMigrationExcluded(normalized)).toBe(true);
  });

  it("keeps labels on the VM model", () => {
    const normalized = normalizeVirtualMachine({
      ...baseVm,
      labels: ["prod"],
    });

    expect(normalized.labels).toEqual(["prod"]);
    expect(getVmTags(normalized)).toEqual(["prod"]);
  });
});

describe("getVmVSphereTags", () => {
  it("flattens metadata into sorted category:value labels", () => {
    const tags = getVmVSphereTags({
      ...baseVm,
      metadata: {
        Owner: ["Platform team"],
        Environment: ["Production"],
        Application: ["Customer portal"],
      },
    } as VirtualMachine);

    expect(tags).toEqual([
      "Application:Customer portal",
      "Environment:Production",
      "Owner:Platform team",
    ]);
  });

  it("returns an empty list when metadata is absent", () => {
    expect(getVmVSphereTags(baseVm)).toEqual([]);
  });
});

describe("virtualMachineFromListJson", () => {
  it("preserves metadata omitted from the list SDK model", () => {
    const vm = virtualMachineFromListJson({
      ...baseVm,
      metadata: { Forklift: ["migrated"] },
    });
    expect(getVmVSphereTags(vm)).toEqual(["Forklift:migrated"]);
  });

  it("normalizes string metadata values", () => {
    const vm = virtualMachineFromListJson({
      ...baseVm,
      metadata: { Forklift: "migrated" },
    });
    expect(getVmVSphereTags(vm)).toEqual(["Forklift:migrated"]);
  });
});

describe("virtualMachineDetailFromJson", () => {
  const detailJson = {
    id: "vm-188922",
    name: "rhel-new-vm",
    vCenterID: "vc1",
    powerState: "poweredOff",
    connectionState: "connected",
    cpuCount: 4,
    coresPerSocket: 1,
    memoryMB: 8192,
    disks: [],
    nicCount: 1,
    nics: [],
    annotation: "VM",
    metadata: {
      Forklift: ["migrated"],
      ami: ["ttt"],
    },
  };

  it("preserves metadata and annotation stripped by the detail SDK model", () => {
    const vm = virtualMachineDetailFromJson(detailJson);
    expect(getVmVSphereTags(vm)).toEqual(["ami:ttt", "Forklift:migrated"]);
    expect(getVmVSphereAnnotation(vm)).toBe("VM");
  });
});

import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import {
  getMigrationExcluded,
  getVmTags,
  normalizeVirtualMachine,
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

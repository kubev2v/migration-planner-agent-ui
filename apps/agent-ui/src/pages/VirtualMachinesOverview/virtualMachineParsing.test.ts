import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import {
  getMigrationExcluded,
  getVmGuestOs,
  getVmOsConfig,
  getVmOsTools,
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

  it("reads guest OS from API aliases with legacy fallbacks", () => {
    const vm = {
      ...baseVm,
      guestName: "Red Hat Enterprise Linux 8 (64-bit)",
      guestNameFromVmwareTools: "RHEL 8 (64-bit)",
    } as VirtualMachine & {
      guestName?: string;
      guestNameFromVmwareTools?: string;
    };

    expect(getVmOsConfig(vm)).toBe("Red Hat Enterprise Linux 8 (64-bit)");
    expect(getVmOsTools(vm)).toBe("RHEL 8 (64-bit)");
    expect(getVmGuestOs(vm)).toBe("RHEL 8 (64-bit)");
  });

  it("falls back to configuration guest OS when VMware Tools is missing", () => {
    const vm = {
      ...baseVm,
      guestName: "Ubuntu Linux (64-bit)",
    } as VirtualMachine & { guestName?: string };

    expect(getVmGuestOs(vm)).toBe("Ubuntu Linux (64-bit)");
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

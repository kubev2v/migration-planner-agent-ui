import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import { normalizeVirtualMachine } from "./virtualMachineParsing";

const baseVm: VirtualMachine = {
  id: "vm-1",
  name: "web-1",
  vCenterState: "poweredOn",
  cluster: "cluster-a",
  datacenter: "dc-1",
  diskSize: 1024,
  memory: 4096,
  issueCount: 0,
};

describe("normalizeVirtualMachine", () => {
  it("maps snake_case migration_excluded to migrationExcluded", () => {
    const normalized = normalizeVirtualMachine({
      ...baseVm,
      migration_excluded: true,
    } as VirtualMachine & { migration_excluded: boolean });

    expect(normalized.migrationExcluded).toBe(true);
  });
});

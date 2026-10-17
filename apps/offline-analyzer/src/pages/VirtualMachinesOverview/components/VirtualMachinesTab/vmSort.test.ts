import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import { groupsSort, labelsSort } from "./vmSort";

const createMockVM = (id: string): VirtualMachine => ({
  id,
  name: `VM-${id}`,
  vCenterID: "vc-1",
  vCenterState: "poweredOn",
  cluster: "test-cluster",
  datacenter: "test-dc",
  diskSize: 100000,
  memory: 8192,
  issueCount: 0,
});

describe("Labels Sort", () => {
  it("sorts by label count ascending", () => {
    const vms = [
      { ...createMockVM("none"), labels: [] },
      { ...createMockVM("many"), labels: ["a", "b", "c"] },
      { ...createMockVM("one"), labels: ["a"] },
    ];

    const sorted = [...vms].sort((a, b) => labelsSort(a) - labelsSort(b));

    expect(sorted.map((vm) => vm.id)).toEqual(["none", "one", "many"]);
  });

  it("treats missing labels as zero", () => {
    expect(labelsSort(createMockVM("no-labels"))).toBe(0);
  });
});

describe("Groups Sort", () => {
  it("sorts by group count ascending", () => {
    const vms = [
      { ...createMockVM("none"), groupItems: [] },
      {
        ...createMockVM("many"),
        groupItems: [
          { id: "g1", name: "Group 1" },
          { id: "g2", name: "Group 2" },
        ],
      },
      { ...createMockVM("one"), groupItems: [{ id: "g1", name: "Group 1" }] },
    ];

    const sorted = [...vms].sort((a, b) => groupsSort(a) - groupsSort(b));

    expect(sorted.map((vm) => vm.id)).toEqual(["none", "one", "many"]);
  });

  it("treats missing groupItems as zero", () => {
    expect(groupsSort(createMockVM("no-groups"))).toBe(0);
  });
});

import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import {
  buildStartInspectionVmIds,
  collectVmIdsUnderInspection,
  getDeepInspectionDisabledTooltip,
  getDeepInspectionEnablement,
  getDeepInspectionEnablementForVmAction,
  isVmUnderInspection,
  MAX_INSPECTION_VMS,
} from "./vmInspectionUtils";

function vm(
  id: string,
  state?: "pending" | "running" | "completed" | "canceled" | "error",
): VirtualMachine {
  return {
    id,
    name: id,
    vCenterState: "",
    cluster: "",
    datacenter: "",
    diskSize: 0,
    memory: 0,
    issueCount: 0,
    migratable: false,
    ...(state ? { inspectionStatus: { state, message: "" } } : {}),
  };
}

describe("isVmUnderInspection", () => {
  it("returns true for running and pending VMs", () => {
    expect(isVmUnderInspection(vm("a", "running"))).toBe(true);
    expect(isVmUnderInspection(vm("b", "pending"))).toBe(true);
  });

  it("returns false for other or missing inspection states", () => {
    expect(isVmUnderInspection(vm("a", "completed"))).toBe(false);
    expect(isVmUnderInspection(vm("b", "error"))).toBe(false);
    expect(isVmUnderInspection(vm("c"))).toBe(false);
  });
});

describe("getDeepInspectionEnablement", () => {
  const vms = [
    vm("idle-1"),
    vm("idle-2"),
    vm("running-1", "running"),
    vm("pending-1", "pending"),
    vm("done-1", "completed"),
  ];

  it("disables when nothing is selected", () => {
    expect(getDeepInspectionEnablement([], vms)).toEqual({
      enabled: false,
      reason: "none-selected",
    });
  });

  it("enables when all selected VMs are not under inspection", () => {
    expect(getDeepInspectionEnablement(["idle-1", "done-1"], vms)).toEqual({
      enabled: true,
      reason: "enabled",
    });
  });

  it("disables when all selected VMs are under inspection", () => {
    expect(
      getDeepInspectionEnablement(["running-1", "pending-1"], vms),
    ).toEqual({
      enabled: false,
      reason: "all-under-inspection",
    });
  });

  it("disables when selection mixes inspected and non-inspected VMs", () => {
    expect(getDeepInspectionEnablement(["idle-1", "running-1"], vms)).toEqual({
      enabled: false,
      reason: "mixed",
    });
  });

  it("enables when other VMs are under inspection but not selected", () => {
    expect(getDeepInspectionEnablement(["idle-2"], vms)).toEqual({
      enabled: true,
      reason: "enabled",
    });
  });

  it("disables when selected IDs are missing from VM data", () => {
    expect(getDeepInspectionEnablement(["missing-id"], vms)).toEqual({
      enabled: false,
      reason: "unknown-selection",
    });
  });
});

describe("getDeepInspectionEnablementForVmAction", () => {
  const vms = [vm("idle-1"), vm("running-1", "running")];

  it("disables row action when checkbox selection is mixed", () => {
    const selected = new Set(["idle-1", "running-1"]);
    expect(
      getDeepInspectionEnablementForVmAction("idle-1", selected, vms).enabled,
    ).toBe(false);
  });

  it("enables row action for an idle VM with no conflicting selection", () => {
    const selected = new Set(["idle-1"]);
    expect(
      getDeepInspectionEnablementForVmAction("idle-1", selected, vms).enabled,
    ).toBe(true);
  });
});

describe("buildStartInspectionVmIds", () => {
  it("includes selected VMs and VMs already under inspection", () => {
    expect(
      buildStartInspectionVmIds(["new-1", "new-2"], ["running-1", "pending-1"]),
    ).toEqual(
      expect.arrayContaining(["new-1", "new-2", "running-1", "pending-1"]),
    );
  });

  it("deduplicates overlapping IDs", () => {
    expect(buildStartInspectionVmIds(["running-1"], ["running-1"])).toEqual([
      "running-1",
    ]);
  });
});

describe("collectVmIdsUnderInspection", () => {
  it("returns only pending and running VM IDs", () => {
    const vms = [
      vm("idle-1"),
      vm("running-1", "running"),
      vm("pending-1", "pending"),
      vm("done-1", "completed"),
    ];
    expect(collectVmIdsUnderInspection(vms)).toEqual([
      "running-1",
      "pending-1",
    ]);
  });
});

describe("getDeepInspectionDisabledTooltip", () => {
  it("returns a retry message for selection load failures", () => {
    expect(getDeepInspectionDisabledTooltip("selection-load-failed")).toContain(
      "Unable to load",
    );
  });
});

describe("MAX_INSPECTION_VMS", () => {
  it("matches the backend session limit", () => {
    expect(MAX_INSPECTION_VMS).toBe(11);
  });
});

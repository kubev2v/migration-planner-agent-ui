import type { VirtualMachine } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";
import { deepInspectionSort } from "./vmSort";

const createMockVM = (
  id: string,
  inspectionStatus?: {
    state?: "running" | "pending" | "completed" | "error" | "canceled";
    concernCount?: number;
  },
): VirtualMachine => ({
  id,
  name: `VM-${id}`,
  vCenterState: "poweredOn",
  cluster: "test-cluster",
  datacenter: "test-dc",
  diskSize: 100000,
  memory: 8192,
  issueCount: 0,
  inspectionStatus: inspectionStatus?.state
    ? {
        state: inspectionStatus.state,
        message: `Mock ${inspectionStatus.state} status`,
      }
    : undefined,
  inspectionConcernCount: inspectionStatus?.concernCount,
});

describe("Deep Inspection Sort", () => {
  const vms = [
    createMockVM("5-completed", { state: "completed", concernCount: 5 }),
    createMockVM("not-run-1"),
    createMockVM("running", { state: "running" }),
    createMockVM("canceled", { state: "canceled" }),
    createMockVM("pending", { state: "pending" }),
    createMockVM("2-error", { state: "error", concernCount: 2 }),
    createMockVM("not-run-2"),
    createMockVM("0-completed", { state: "completed", concernCount: 0 }),
  ];

  it("should sort VMs correctly in ascending order", () => {
    const sorted = [...vms].sort(
      (a, b) => deepInspectionSort(a) - deepInspectionSort(b),
    );

    expect(sorted[0].id).toBe("running");
    expect(sorted[1].id).toBe("pending");
    expect(sorted[2].id).toBe("0-completed");
    expect(sorted[3].id).toBe("5-completed");
    expect(sorted[4].id).toBe("2-error");
    expect(sorted[5].id).toBe("canceled");
    expect(sorted[6].id).toBe("not-run-1");
    expect(sorted[7].id).toBe("not-run-2");
  });

  it("should sort VMs correctly in decending order", () => {
    const sorted = [...vms].sort(
      (a, b) => deepInspectionSort(b) - deepInspectionSort(a),
    );

    expect(sorted[0].id).toBe("not-run-1");
    expect(sorted[1].id).toBe("not-run-2");
    expect(sorted[2].id).toBe("canceled");
    expect(sorted[3].id).toBe("2-error");
    expect(sorted[4].id).toBe("5-completed");
    expect(sorted[5].id).toBe("0-completed");
    expect(sorted[6].id).toBe("pending");
    expect(sorted[7].id).toBe("running");
  });
});

import { describe, expect, it } from "vitest";
import { isCanceledInspectionStatus } from "./vmInspectionUtils";

describe("isCanceledInspectionStatus", () => {
  const userCanceled = new Set(["vm-user-cancel"]);

  it("returns true when state is canceled", () => {
    expect(
      isCanceledInspectionStatus("vm-1", { state: "canceled" }, userCanceled),
    ).toBe(true);
  });

  it("returns true for error state when the VM was user-canceled", () => {
    expect(
      isCanceledInspectionStatus(
        "vm-user-cancel",
        {
          state: "error",
          error: "virt-inspector failed (exit code 1)",
        },
        userCanceled,
      ),
    ).toBe(true);
  });

  it("returns false for error state when the VM was not user-canceled", () => {
    expect(
      isCanceledInspectionStatus(
        "vm-failed",
        {
          state: "error",
          error: "virt-inspector failed (exit code 1)",
        },
        userCanceled,
      ),
    ).toBe(false);
  });

  it("returns false for other terminal states", () => {
    expect(
      isCanceledInspectionStatus(
        "vm-user-cancel",
        { state: "completed" },
        userCanceled,
      ),
    ).toBe(false);
  });
});

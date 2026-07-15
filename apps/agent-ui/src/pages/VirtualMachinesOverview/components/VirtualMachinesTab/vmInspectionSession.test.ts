import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CANCELED_INSPECTION_VMS_SESSION_KEY,
  loadUserCanceledInspectionVmIds,
  saveUserCanceledInspectionVmIds,
} from "./vmInspectionSession";

describe("user-canceled inspection VM session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("persists and reloads canceled VM ids", () => {
    saveUserCanceledInspectionVmIds(new Set(["vm-1", "vm-2"]));
    expect(loadUserCanceledInspectionVmIds()).toEqual(
      new Set(["vm-1", "vm-2"]),
    );
  });

  it("returns an empty set when storage is empty or invalid", () => {
    expect(loadUserCanceledInspectionVmIds()).toEqual(new Set());
    sessionStorage.setItem(CANCELED_INSPECTION_VMS_SESSION_KEY, "not-json");
    expect(loadUserCanceledInspectionVmIds()).toEqual(new Set());
  });
});

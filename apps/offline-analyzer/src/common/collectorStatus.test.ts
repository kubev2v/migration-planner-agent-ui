import { describe, expect, it } from "vitest";
import { isCollectorInProgress } from "./collectorStatus";

describe("isCollectorInProgress", () => {
  it("returns true for in-progress statuses", () => {
    expect(isCollectorInProgress("connecting")).toBe(true);
    expect(isCollectorInProgress("collecting")).toBe(true);
    expect(isCollectorInProgress("collecting metrics")).toBe(true);
    expect(isCollectorInProgress("parsing")).toBe(true);
  });

  it("returns false for terminal or idle statuses", () => {
    expect(isCollectorInProgress("collected")).toBe(false);
    expect(isCollectorInProgress("ready")).toBe(false);
    expect(isCollectorInProgress("error")).toBe(false);
    expect(isCollectorInProgress(null)).toBe(false);
    expect(isCollectorInProgress(undefined)).toBe(false);
  });
});

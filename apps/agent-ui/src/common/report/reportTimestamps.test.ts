import { describe, expect, it } from "vitest";
import {
  formatDataCollectedOn,
  formatGroupLastUpdated,
} from "./reportTimestamps";

describe("reportTimestamps", () => {
  it("formats the collected-on time with seconds", () => {
    expect(
      formatDataCollectedOn(
        new Date("2026-08-17T14:30:00.000Z"),
        "en-US",
        "America/New_York",
      ),
    ).toBe("8/17/2026, 10:30:00 AM");
  });

  it("formats a group last-updated time with the timezone", () => {
    expect(
      formatGroupLastUpdated(
        new Date("2026-09-16T15:55:00.000Z"),
        "en-US",
        "America/New_York",
      ),
    ).toBe("September 16, 2026 at 11:55 AM EDT");
  });
});

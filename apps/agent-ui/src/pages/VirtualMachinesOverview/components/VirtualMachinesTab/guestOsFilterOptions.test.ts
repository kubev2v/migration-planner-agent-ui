import { describe, expect, it } from "vitest";
import { mergeGuestOsFilterOptions } from "./guestOsFilterOptions";

describe("mergeGuestOsFilterOptions", () => {
  it("deduplicates and sorts config and tools values", () => {
    expect(
      mergeGuestOsFilterOptions(
        ["Ubuntu Linux (64-bit)", "Red Hat Enterprise Linux 8 (64-bit)"],
        ["Ubuntu Linux (64-bit)", "Microsoft Windows 10 (64-bit)"],
      ),
    ).toEqual([
      "Microsoft Windows 10 (64-bit)",
      "Red Hat Enterprise Linux 8 (64-bit)",
      "Ubuntu Linux (64-bit)",
    ]);
  });
});

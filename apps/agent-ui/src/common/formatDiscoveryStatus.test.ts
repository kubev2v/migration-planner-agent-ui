import { describe, expect, it } from "vitest";
import { formatDiscoveryStatus } from "./formatDiscoveryStatus";

describe("formatDiscoveryStatus", () => {
  it("capitalizes the console connection status", () => {
    expect(
      formatDiscoveryStatus({
        mode: "disconnected",
        consoleConnection: { status: "disconnected" },
      }),
    ).toBe("Disconnected");
  });

  it("returns Unknown when agent status is missing", () => {
    expect(formatDiscoveryStatus(null)).toBe("Unknown");
    expect(formatDiscoveryStatus(undefined)).toBe("Unknown");
  });
});

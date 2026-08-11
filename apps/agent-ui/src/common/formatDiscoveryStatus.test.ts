import { describe, expect, it } from "vitest";
import { getDiscoverySharingStatus } from "./formatDiscoveryStatus";

describe("getDiscoverySharingStatus", () => {
  it("returns Sharing when console connection is connected", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "connected",
        consoleConnection: { status: "connected" },
      }),
    ).toEqual({ label: "Sharing" });
  });

  it("returns Not sharing when console connection is disconnected", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "disconnected",
        consoleConnection: { status: "disconnected" },
      }),
    ).toEqual({ label: "Not sharing" });
  });

  it("returns Sharing error when console connection has an error", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "connected",
        consoleConnection: { status: "disconnected", error: "timeout" },
      }),
    ).toEqual({ label: "Sharing error", error: "timeout" });
  });

  it("returns Not sharing when agent status is null", () => {
    expect(getDiscoverySharingStatus(null)).toEqual({ label: "Not sharing" });
  });
});

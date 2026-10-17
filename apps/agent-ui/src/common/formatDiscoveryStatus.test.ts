import { describe, expect, it } from "vitest";
import { getDiscoverySharingStatus } from "./formatDiscoveryStatus";

describe("getDiscoverySharingStatus", () => {
  it("returns Sharing when console connection is connected", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "connected",
        consoleConnection: { status: "connected" },
      }),
    ).toEqual("Sharing");
  });

  it("returns Not sharing when console connection is disconnected", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "disconnected",
        consoleConnection: { status: "disconnected" },
      }),
    ).toEqual("Not sharing");
  });

  it("returns Sharing error when console connection has an error", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "connected",
        consoleConnection: { status: "disconnected", error: "timeout" },
      }),
    ).toEqual("Sharing error");
  });

  it("returns Not sharing when agent status is null", () => {
    expect(getDiscoverySharingStatus(null)).toEqual("Not sharing");
  });
});

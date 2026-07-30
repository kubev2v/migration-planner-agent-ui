import { describe, expect, it } from "vitest";
import {
  formatDiscoveryStatus,
  getDiscoverySharingStatus,
} from "./formatDiscoveryStatus";

describe("formatDiscoveryStatus", () => {
  it("returns Not sharing when console_connection is empty, null, or disconnected", () => {
    expect(formatDiscoveryStatus(null)).toBe("Not sharing");
    expect(formatDiscoveryStatus(undefined)).toBe("Not sharing");
    expect(
      formatDiscoveryStatus({
        mode: "disconnected",
        console_connection: null as unknown as "disconnected",
      }),
    ).toBe("Not sharing");
    expect(
      formatDiscoveryStatus({
        mode: "disconnected",
        console_connection: "disconnected",
      }),
    ).toBe("Not sharing");
  });

  it("returns Sharing when console_connection is connected", () => {
    expect(
      formatDiscoveryStatus({
        mode: "connected",
        console_connection: "connected",
      }),
    ).toBe("Sharing");
  });

  it("returns Sharing error when an error is present", () => {
    expect(
      formatDiscoveryStatus({
        mode: "connected",
        console_connection: "connected",
        error: "Failed to share inventory",
      }),
    ).toBe("Sharing error");
  });
});

describe("getDiscoverySharingStatus", () => {
  it("includes the error message for Sharing error", () => {
    expect(
      getDiscoverySharingStatus({
        mode: "connected",
        console_connection: "connected",
        error: "Failed to share inventory",
      }),
    ).toEqual({
      label: "Sharing error",
      error: "Failed to share inventory",
    });
  });
});

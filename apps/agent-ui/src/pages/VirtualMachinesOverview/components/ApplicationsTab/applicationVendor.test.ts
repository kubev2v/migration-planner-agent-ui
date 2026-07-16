import { describe, expect, it } from "vitest";
import { getApplicationVendor } from "./applicationVendor";

describe("getApplicationVendor", () => {
  it("returns catalog vendor when known", () => {
    expect(getApplicationVendor("MongoDB")).toBe("MongoDB, Inc.");
  });

  it("returns em dash when vendor is unknown", () => {
    expect(getApplicationVendor("Custom App")).toBe("—");
  });
});

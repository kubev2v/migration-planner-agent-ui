import { describe, expect, it } from "vitest";
import { scopesToExportParam } from "./exportScopes";

describe("scopesToExportParam", () => {
  it("joins scopes into a comma-separated export param", () => {
    expect(scopesToExportParam(["overview", "hosts", "vms"])).toBe(
      "overview,hosts,vms",
    );
  });

  it("returns undefined when no scopes are selected", () => {
    expect(scopesToExportParam([])).toBeUndefined();
  });
});

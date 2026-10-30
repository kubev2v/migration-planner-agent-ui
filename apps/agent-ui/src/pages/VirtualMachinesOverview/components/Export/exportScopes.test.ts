import { describe, expect, it } from "vitest";
import { PROCESSES_EXPORT_SCOPE_ID, scopesToExportParam } from "./exportScopes";

describe("scopesToExportParam", () => {
  it("joins scopes into a comma-separated export param", () => {
    expect(scopesToExportParam(["overview", "hosts", "vms"])).toBe(
      "overview,hosts,vms",
    );
  });

  it("includes the processes scope in the export param", () => {
    expect(scopesToExportParam(["overview", PROCESSES_EXPORT_SCOPE_ID])).toBe(
      "overview,processes",
    );
  });

  it("returns undefined when no scopes are selected", () => {
    expect(scopesToExportParam([])).toBeUndefined();
  });
});

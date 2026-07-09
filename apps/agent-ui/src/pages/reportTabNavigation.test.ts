import { describe, expect, it } from "vitest";
import {
  buildApplicationDetailUrl,
  buildVmDetailUrl,
  REPORT_TAB,
  resolveReportTab,
} from "./reportTabNavigation";

describe("resolveReportTab", () => {
  it("returns the applications tab from the URL", () => {
    expect(
      resolveReportTab(new URLSearchParams("tab=applications"), false),
    ).toBe(REPORT_TAB.applications);
  });

  it("opens the VMs tab when filters are active without a tab param", () => {
    expect(resolveReportTab(new URLSearchParams("search=web"), true)).toBe(
      REPORT_TAB.vms,
    );
  });

  it("defaults to overview", () => {
    expect(resolveReportTab(new URLSearchParams(), false)).toBe(
      REPORT_TAB.overview,
    );
  });
});

describe("buildApplicationDetailUrl", () => {
  it("opens the applications tab with the selected application", () => {
    const params = buildApplicationDetailUrl(
      new URLSearchParams("tab=vms&vmId=vm-1&search=web"),
      "Nginx",
    );
    expect(params.get("tab")).toBe("applications");
    expect(params.get("application")).toBe("Nginx");
    expect(params.get("vmId")).toBeNull();
    expect(params.get("search")).toBeNull();
  });
});

describe("buildVmDetailUrl", () => {
  it("sets tab and vmId while clearing VM filters", () => {
    const params = buildVmDetailUrl(
      new URLSearchParams("search=web&tab=applications"),
      "vm-123",
    );
    expect(params.get("tab")).toBe("vms");
    expect(params.get("vmId")).toBe("vm-123");
    expect(params.get("search")).toBeNull();
  });
});

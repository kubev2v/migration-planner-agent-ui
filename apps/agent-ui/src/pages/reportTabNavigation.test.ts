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
  it("sets tab and vmId while clearing applications-tab params", () => {
    const params = buildVmDetailUrl(
      new URLSearchParams("search=web&tab=applications&application=Nginx"),
      "vm-123",
    );
    expect(params.get("tab")).toBe("vms");
    expect(params.get("vmId")).toBe("vm-123");
    expect(params.get("application")).toBeNull();
    expect(params.get("search")).toBe("web");
  });

  it("preserves VM filter params when opening details", () => {
    const params = new URLSearchParams("tab=vms");
    params.append("applications", "SAP ERP");
    params.set("search", "web");

    const detailParams = buildVmDetailUrl(params, "vm-123");
    expect(detailParams.get("search")).toBe("web");
    expect(detailParams.getAll("applications")).toEqual(["SAP ERP"]);
  });

  it("sets vmSection when a detail section is requested", () => {
    const params = buildVmDetailUrl(new URLSearchParams("tab=vms"), "vm-123", {
      section: "applications",
    });
    expect(params.get("vmSection")).toBe("applications");
  });
});

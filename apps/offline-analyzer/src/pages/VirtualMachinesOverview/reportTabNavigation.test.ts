import { describe, expect, it } from "vitest";
import {
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  REPORT_TAB,
  resolveReportTab,
} from "./reportTabNavigation";

describe("resolveReportTab", () => {
  it("returns the VMs tab from the URL", () => {
    expect(resolveReportTab(new URLSearchParams("tab=vms"), false)).toBe(
      REPORT_TAB.vms,
    );
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

describe("buildVmDetailUrl", () => {
  it("sets tab and vmId", () => {
    const params = buildVmDetailUrl(
      new URLSearchParams("search=web&tab=overview"),
      "vm-123",
    );
    expect(params.get("tab")).toBe("vms");
    expect(params.get("vmId")).toBe("vm-123");
    expect(params.get("search")).toBe("web");
  });

  it("sets vmSection when a detail section is requested", () => {
    const params = buildVmDetailUrl(new URLSearchParams("tab=vms"), "vm-123", {
      section: "issues",
    });
    expect(params.get("vmSection")).toBe("issues");
  });

  it("passes through any section name without validating it", () => {
    const params = buildVmDetailUrl(new URLSearchParams("tab=vms"), "vm-123", {
      section: "issues_errors",
    });
    expect(params.get("vmSection")).toBe("issues_errors");
  });
});

describe("tab navigation URLs", () => {
  it("preserves VM filters when switching to the overview tab", () => {
    const params = buildOverviewTabUrl(
      new URLSearchParams("tab=vms&reportInclusion=included&search=web"),
    );
    expect(params.get("tab")).toBe("overview");
    expect(params.get("reportInclusion")).toBe("included");
    expect(params.get("search")).toBe("web");
    expect(params.get("vmId")).toBeNull();
  });

  it("preserves VM filters when switching back to the VMs tab", () => {
    const params = buildVmsTabUrl(
      new URLSearchParams("tab=overview&reportInclusion=included"),
    );
    expect(params.get("tab")).toBe("vms");
    expect(params.get("reportInclusion")).toBe("included");
  });
});

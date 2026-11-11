import { describe, expect, it } from "vitest";
import {
  buildApplianceDetailUrl,
  buildAppliancesTabUrl,
  buildApplicationDetailUrl,
  buildApplicationsTabUrl,
  buildOverviewTabUrl,
  buildVmDetailUrl,
  buildVmsTabUrl,
  CLUSTER_PARAM,
  getClusterParam,
  REPORT_TAB,
  resolveReportTab,
  setClusterParam,
  setTabParam,
} from "./reportTabNavigation";

describe("resolveReportTab", () => {
  it("returns the applications tab from the URL", () => {
    expect(
      resolveReportTab(new URLSearchParams("tab=applications"), false),
    ).toBe(REPORT_TAB.applications);
  });

  it("returns the appliances tab from the URL", () => {
    expect(resolveReportTab(new URLSearchParams("tab=appliances"), false)).toBe(
      REPORT_TAB.appliances,
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

describe("buildApplianceDetailUrl", () => {
  it("opens the appliances tab with the selected appliance", () => {
    const params = buildApplianceDetailUrl(
      new URLSearchParams("tab=vms&application=Nginx"),
      "F5 BIG-IP Virtual Edition",
    );
    expect(params.get("tab")).toBe("appliances");
    expect(params.get("appliance")).toBe("F5 BIG-IP Virtual Edition");
    expect(params.get("application")).toBeNull();
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
    expect(params.get("search")).toBe("web");
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

  it("preserves VM filters when switching to the applications tab", () => {
    const params = buildApplicationsTabUrl(
      new URLSearchParams("tab=vms&reportInclusion=excluded"),
    );
    expect(params.get("tab")).toBe("applications");
    expect(params.get("reportInclusion")).toBe("excluded");
  });

  it("preserves VM filters when switching to the appliances tab", () => {
    const params = buildAppliancesTabUrl(
      new URLSearchParams("tab=vms&reportInclusion=excluded"),
    );
    expect(params.get("tab")).toBe("appliances");
    expect(params.get("reportInclusion")).toBe("excluded");
  });

  it("preserves cluster scope when switching tabs", () => {
    const params = buildVmsTabUrl(
      new URLSearchParams("tab=overview&cluster=prod-cluster"),
    );
    expect(params.get(CLUSTER_PARAM)).toBe("prod-cluster");
  });
});

describe("cluster selection URL helpers", () => {
  it("defaults to all when the cluster param is missing", () => {
    expect(getClusterParam(new URLSearchParams())).toBe("all");
  });

  it("reads and writes the cluster scope param", () => {
    const params = new URLSearchParams();
    setClusterParam(params, "prod-cluster");
    expect(params.get(CLUSTER_PARAM)).toBe("prod-cluster");
    expect(getClusterParam(params)).toBe("prod-cluster");

    setClusterParam(params, "all");
    expect(params.get(CLUSTER_PARAM)).toBeNull();
  });

  it("copies cluster scope into a rebuilt filter URL", () => {
    const source = new URLSearchParams("cluster=prod-cluster&tab=vms");
    const target = new URLSearchParams("tab=vms&search=web");
    setClusterParam(target, getClusterParam(source));
    expect(target.get(CLUSTER_PARAM)).toBe("prod-cluster");
    expect(target.get("search")).toBe("web");
  });

  it("writes the tab param from a tab index", () => {
    const params = new URLSearchParams();
    setTabParam(params, REPORT_TAB.applications);
    expect(params.get("tab")).toBe("applications");

    setTabParam(params, REPORT_TAB.appliances);
    expect(params.get("tab")).toBe("appliances");
  });
});

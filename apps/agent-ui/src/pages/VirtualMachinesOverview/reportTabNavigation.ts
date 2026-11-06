/** Tab indices for report overview pages (Assessment / VMs / Applications). */
export const REPORT_TAB = {
  overview: 0,
  vms: 1,
  applications: 2,
} as const;

export type ReportTabIndex = (typeof REPORT_TAB)[keyof typeof REPORT_TAB];

/**
 * Page-level vSphere cluster scope (header dropdown).
 * Distinct from the VM-table multi-select filter param `clusters`.
 */
export const CLUSTER_PARAM = "cluster";

/**
 * Selected vCenter for multi-vCenter report inventory: SaaS `GET .../assessments/.../vcenters/{id}`,
 * or standalone analyzer `GET .../inventory/vcenters/{vid}`. Omitted or `all` means aggregated
 * inventory across vCenters.
 */
export const VCENTER_PARAM = "vcenter";

export function getClusterParam(searchParams: URLSearchParams): string {
  return searchParams.get(CLUSTER_PARAM) ?? "all";
}

export function getVcenterParam(searchParams: URLSearchParams): string {
  return searchParams.get(VCENTER_PARAM) ?? "all";
}

/** Writes or clears the vCenter scope param (`all` / empty removes it). */
export function setVcenterParam(
  params: URLSearchParams,
  vcenterId: string,
): void {
  if (!vcenterId || vcenterId === "all") {
    params.delete(VCENTER_PARAM);
  } else {
    params.set(VCENTER_PARAM, vcenterId);
  }
}

/** Writes or clears the cluster scope param (`all` / empty removes it). */
export function setClusterParam(
  params: URLSearchParams,
  clusterId: string,
): void {
  if (!clusterId || clusterId === "all") {
    params.delete(CLUSTER_PARAM);
  } else {
    params.set(CLUSTER_PARAM, clusterId);
  }
}

/** Writes the active report tab param. */
export function setTabParam(
  params: URLSearchParams,
  tabIndex: string | number,
): void {
  params.set("tab", reportTabToParam(tabIndex));
}

export function reportTabFromParam(tabParam: string | null): ReportTabIndex {
  if (tabParam === "vms") {
    return REPORT_TAB.vms;
  }
  if (tabParam === "applications") {
    return REPORT_TAB.applications;
  }
  if (tabParam === "overview") {
    return REPORT_TAB.overview;
  }
  return REPORT_TAB.overview;
}

/** Resolves the active tab from URL params, including legacy VM-filter behavior. */
export function resolveReportTab(
  searchParams: URLSearchParams,
  hasActiveVmFilters: boolean,
): ReportTabIndex {
  const tabParam = searchParams.get("tab");
  if (tabParam === "vms") {
    return REPORT_TAB.vms;
  }
  if (tabParam === "applications") {
    return REPORT_TAB.applications;
  }
  if (tabParam === "overview") {
    return REPORT_TAB.overview;
  }
  if (!tabParam && hasActiveVmFilters) {
    return REPORT_TAB.vms;
  }
  return REPORT_TAB.overview;
}

function reportTabToParam(tabIndex: string | number): string {
  if (tabIndex === REPORT_TAB.vms) {
    return "vms";
  }
  if (tabIndex === REPORT_TAB.applications) {
    return "applications";
  }
  return "overview";
}

/** Removes VM-table filter query params (not tab or vmId). */
export function clearVmFilterParams(params: URLSearchParams): void {
  params.delete("statuses");
  params.delete("hasIssues");
  params.delete("noIssues");
  params.delete("clusters");
  params.delete("datacenters");
  params.delete("networks");
  params.delete("search");
  params.delete("diskRangeMin");
  params.delete("diskRangeMax");
  params.delete("memoryRangeMin");
  params.delete("memoryRangeMax");
  params.delete("cpuUsageRangeMin");
  params.delete("cpuUsageRangeMax");
  params.delete("ramUsageRangeMin");
  params.delete("ramUsageRangeMax");
  params.delete("diskUsageRangeMin");
  params.delete("diskUsageRangeMax");
  params.delete("migrationReadiness");
  params.delete("reportInclusion");
  params.delete("vmLabels");
  params.delete("concernLabels");
  params.delete("concernCategories");
  params.delete("vmApplication");
  params.delete("applications");
  params.delete("application");
  params.delete("vmSection");
}

export function buildVmDetailUrl(
  searchParams: URLSearchParams,
  vmId: string,
  options?: { section?: string },
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("application");
  setTabParam(params, REPORT_TAB.vms);
  params.set("vmId", vmId);
  if (options?.section) {
    params.set("vmSection", options.section);
  } else {
    params.delete("vmSection");
  }
  return params;
}

export function buildApplicationsTabUrl(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("vmId");
  setTabParam(params, REPORT_TAB.applications);
  return params;
}

export function buildApplicationDetailUrl(
  searchParams: URLSearchParams,
  applicationName: string,
): URLSearchParams {
  const params = buildApplicationsTabUrl(searchParams);
  params.set("application", applicationName);
  return params;
}

export function buildVmsTabUrl(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("vmId");
  setTabParam(params, REPORT_TAB.vms);
  return params;
}

export function buildOverviewTabUrl(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("vmId");
  setTabParam(params, REPORT_TAB.overview);
  return params;
}

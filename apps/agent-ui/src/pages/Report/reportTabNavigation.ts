/** Tab indices for report overview pages (Assessment / VMs / Applications). */
export const REPORT_TAB = {
  overview: 0,
  vms: 1,
  applications: 2,
} as const;

export type ReportTabIndex = (typeof REPORT_TAB)[keyof typeof REPORT_TAB];

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

export function reportTabToParam(tabIndex: string | number): string {
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
  params.delete("search");
  params.delete("diskRangeMin");
  params.delete("diskRangeMax");
  params.delete("memoryRangeMin");
  params.delete("memoryRangeMax");
  params.delete("migrationReadiness");
  params.delete("vmLabels");
  params.delete("concernLabels");
  params.delete("concernCategories");
}

export function buildVmDetailUrl(
  searchParams: URLSearchParams,
  vmId: string,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  clearVmFilterParams(params);
  params.set("tab", "vms");
  params.set("vmId", vmId);
  return params;
}

export function buildApplicationsTabUrl(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  clearVmFilterParams(params);
  params.delete("vmId");
  params.set("tab", "applications");
  return params;
}

export function buildVmsTabUrl(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  clearVmFilterParams(params);
  params.delete("vmId");
  params.set("tab", "vms");
  return params;
}

export function buildOverviewTabUrl(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  clearVmFilterParams(params);
  params.delete("vmId");
  params.set("tab", "overview");
  return params;
}

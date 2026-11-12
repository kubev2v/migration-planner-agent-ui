import type { RecommendationToolId } from "@openshift-migration-advisor/shared-components";

/** Tab indices for report overview pages (Assessment / VMs / Recommendations). */
export const REPORT_TAB = {
  overview: 0,
  vms: 1,
  recommendations: 2,
} as const;

export const RECOMMENDATION_TOOL_PARAM = "recommendationTool";

const RECOMMENDATION_TOOL_IDS = new Set<RecommendationToolId>([
  "architecture",
  "cost-estimation",
  "time-estimation",
  "complexity",
]);

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

/** Resolves the active tab from URL params, including legacy VM-filter behavior. */
export function resolveReportTab(
  searchParams: URLSearchParams,
  hasActiveVmFilters: boolean,
): ReportTabIndex {
  const tabParam = searchParams.get("tab");
  if (tabParam === "vms") {
    return REPORT_TAB.vms;
  }
  if (tabParam === "recommendations") {
    return REPORT_TAB.recommendations;
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
  if (tabIndex === REPORT_TAB.recommendations) {
    return "recommendations";
  }
  return "overview";
}

export function getRecommendationToolParam(
  searchParams: URLSearchParams,
): RecommendationToolId | null {
  const value = searchParams.get(RECOMMENDATION_TOOL_PARAM);
  if (!value || !RECOMMENDATION_TOOL_IDS.has(value as RecommendationToolId)) {
    return null;
  }
  return value as RecommendationToolId;
}

export function setRecommendationToolParam(
  params: URLSearchParams,
  toolId: RecommendationToolId,
): void {
  params.set(RECOMMENDATION_TOOL_PARAM, toolId);
}

export function clearRecommendationToolParam(params: URLSearchParams): void {
  params.delete(RECOMMENDATION_TOOL_PARAM);
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
  params.delete("vmSection");
}

export function buildVmDetailUrl(
  searchParams: URLSearchParams,
  vmId: string,
  options?: { section?: string },
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  setTabParam(params, REPORT_TAB.vms);
  params.set("vmId", vmId);
  if (options?.section) {
    params.set("vmSection", options.section);
  } else {
    params.delete("vmSection");
  }
  return params;
}

export function buildVmsTabUrl(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("vmId");
  setTabParam(params, REPORT_TAB.vms);
  clearRecommendationToolParam(params);
  return params;
}

export function buildOverviewTabUrl(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("vmId");
  setTabParam(params, REPORT_TAB.overview);
  clearRecommendationToolParam(params);
  return params;
}

export function buildRecommendationsTabUrl(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete("vmId");
  setTabParam(params, REPORT_TAB.recommendations);
  return params;
}

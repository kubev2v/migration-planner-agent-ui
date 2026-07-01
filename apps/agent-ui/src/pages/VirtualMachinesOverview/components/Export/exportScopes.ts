/**
 * CSV export scopes for GET /export (`scope` query param).
 *
 * Keep this list aligned with the agent OpenAPI spec (`GET /export` in
 * `assisted-migration-agent/api/v1/openapi.yaml`). The API also supports
 * `inspection`, which is intentionally omitted from the UI until product/UX
 * adds it to the export modal.
 */
export type ExportScopeId =
  | "overview"
  | "hosts"
  | "clusters"
  | "datastores"
  | "vms"
  | "network"
  | "utilization"
  | "storage-forecast"
  | "applications"
  | "groups";

export type ExportScopeOption = {
  id: ExportScopeId;
  label: string;
  description?: string;
};

export const EXPORT_SCOPE_OPTIONS: ExportScopeOption[] = [
  {
    id: "overview",
    label: "Overview",
    description: "VM summary with migration readiness",
  },
  {
    id: "hosts",
    label: "Hosts",
    description: "ESXi host inventory",
  },
  {
    id: "clusters",
    label: "Clusters",
    description: "vSphere cluster configuration",
  },
  {
    id: "datastores",
    label: "Datastores",
    description: "Datastore capacity inventory",
  },
  {
    id: "vms",
    label: "VMs",
    description: "Complete VM configuration details",
  },
  {
    id: "network",
    label: "Network",
    description: "VM network adapters and IP addresses",
  },
  {
    id: "utilization",
    label: "Utilization",
    description: "VM and cluster resource usage metrics",
  },
  {
    id: "storage-forecast",
    label: "Storage forecast",
    description: "Storage migration timing benchmarks",
  },
  {
    id: "applications",
    label: "Applications",
    description: "Discovered applications and VM mappings",
  },
  {
    id: "groups",
    label: "Groups",
    description: "Custom VM groups and membership",
  },
];

export const DEFAULT_EXPORT_SCOPES: ExportScopeId[] = ["overview"];

export function scopesToExportParam(
  scopes: ExportScopeId[],
): string | undefined {
  if (scopes.length === 0) {
    return undefined;
  }

  return scopes.join(",");
}

/**
 * Export scopes for GET /collections/{id}/export (`scope` query param).
 *
 * Keep this list aligned with the agent OpenAPI spec
 * (`assisted-migration-agent/api/v2/openapi.yaml`). v2 returns a ZIP of CSV
 * files only (no xlsx / format query param).
 */

export type ExportFormat = "zip";

export const DEFAULT_EXPORT_FORMAT: ExportFormat = "zip";
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

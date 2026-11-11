import type { ApplianceOverview } from "./appliancesApi";
import { matchesSearch } from "./applicationFilters";

export interface ApplianceFilterState {
  nameSearch: string;
  vmIds: string[];
  vendors: string[];
  versions: string[];
}

export function filterAppliances(
  appliances: ApplianceOverview[],
  filters: ApplianceFilterState,
): ApplianceOverview[] {
  const selectedVmIds = new Set(filters.vmIds);
  const nameSearch = filters.nameSearch.trim();
  const selectedVendors = new Set(filters.vendors);
  const selectedVersions = new Set(filters.versions);

  return appliances.filter((appliance) => {
    if (nameSearch && !matchesSearch(appliance.name, nameSearch)) {
      return false;
    }
    if (selectedVendors.size > 0) {
      const vendor = appliance.vendor?.trim() || "Unknown";
      if (!selectedVendors.has(vendor)) {
        return false;
      }
    }
    if (selectedVersions.size > 0) {
      const version = appliance.version?.trim() || "—";
      if (!selectedVersions.has(version)) {
        return false;
      }
    }
    if (selectedVmIds.size > 0) {
      return appliance.vms.some((vm) => selectedVmIds.has(vm.id));
    }
    return true;
  });
}

export function getUniqueApplianceVendors(
  appliances: ApplianceOverview[],
): string[] {
  const vendors = new Set<string>();
  for (const appliance of appliances) {
    vendors.add(appliance.vendor?.trim() || "Unknown");
  }
  return [...vendors].sort((a, b) => a.localeCompare(b));
}

export function getUniqueApplianceVersions(
  appliances: ApplianceOverview[],
): string[] {
  const versions = new Set<string>();
  for (const appliance of appliances) {
    versions.add(appliance.version?.trim() || "—");
  }
  return [...versions].sort((a, b) => a.localeCompare(b));
}

export function getUniqueApplianceVms(
  appliances: ApplianceOverview[],
): ApplianceOverview["vms"] {
  const vmById = new Map<string, ApplianceOverview["vms"][number]>();
  for (const appliance of appliances) {
    for (const vm of appliance.vms) {
      vmById.set(vm.id, vm);
    }
  }
  return Array.from(vmById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

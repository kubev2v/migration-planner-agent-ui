import type { ApplicationOverview, ApplicationVM } from "./applicationsApi";

export interface ApplicationFilterState {
  nameSearch: string;
  vmIds: string[];
}

export function matchesSearch(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export function getUniqueVms(
  applications: ApplicationOverview[],
): ApplicationVM[] {
  const vmById = new Map<string, ApplicationVM>();
  for (const application of applications) {
    for (const vm of application.vms) {
      vmById.set(vm.id, vm);
    }
  }
  return Array.from(vmById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function buildVmLookup(
  applications: ApplicationOverview[],
): Map<string, ApplicationVM> {
  return new Map(getUniqueVms(applications).map((vm) => [vm.id, vm]));
}

export function filterApplications(
  applications: ApplicationOverview[],
  filters: ApplicationFilterState,
): ApplicationOverview[] {
  const selectedVmIds = new Set(filters.vmIds);
  const nameSearch = filters.nameSearch.trim();

  return applications.filter((application) => {
    if (nameSearch && !matchesSearch(application.name, nameSearch)) {
      return false;
    }
    if (selectedVmIds.size > 0) {
      return application.vms.some((vm) => selectedVmIds.has(vm.id));
    }
    return true;
  });
}

export function filterVmsBySearch(
  vms: ApplicationVM[],
  search: string,
): ApplicationVM[] {
  if (!search.trim()) {
    return vms;
  }
  return vms.filter((vm) => matchesSearch(vm.name, search));
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getVmFilterLabel(
  selectedVmIds: string[],
  vmById: Map<string, ApplicationVM>,
): string {
  if (selectedVmIds.length === 0) {
    return "Filter by Virtual machines";
  }
  if (selectedVmIds.length === 1) {
    return vmById.get(selectedVmIds[0])?.name ?? "1 virtual machine";
  }
  return `${selectedVmIds.length} virtual machines`;
}

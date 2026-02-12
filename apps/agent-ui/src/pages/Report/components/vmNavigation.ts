import { filtersToSearchParams, type VMFilters } from "./vmFilters";

/**
 * Creates a URL to navigate to the Virtual Machines tab with specific filters
 * @param filters - The filters to apply
 * @param basePath - The base path (defaults to "/report")
 * @returns A URL string with the filters encoded
 */
export function createVMFilterURL(
  filters: VMFilters,
  basePath = "/report",
): string {
  const params = filtersToSearchParams(filters);
  params.set("tab", "vms");
  return `${basePath}?${params.toString()}`;
}

/**
 * Example usage:
 *
 * ```tsx
 * import { createVMFilterURL } from './vmNavigation';
 * import { useNavigate } from 'react-router-dom';
 *
 * const navigate = useNavigate();
 *
 * // Navigate to VMs with only issues
 * navigate(createVMFilterURL({ hasIssues: true }));
 *
 * // Navigate to VMs with specific disk size range
 * navigate(createVMFilterURL({ diskRange: 2 })); // 21-50 TB
 *
 * // Navigate to VMs with multiple filters
 * navigate(createVMFilterURL({
 *   hasIssues: true,
 *   statuses: ['poweredOn'],
 *   diskRange: 3
 * }));
 * ```
 */

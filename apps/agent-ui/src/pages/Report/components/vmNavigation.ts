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
 * navigate(createVMFilterURL({ diskRange: { min: 20 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 } })); // 21-50 TB in MB
 *
 * // Navigate to VMs with multiple filters
 * navigate(createVMFilterURL({
 *   hasIssues: true,
 *   statuses: ['poweredOn'],
 *   diskRange: { min: 50 * 1024 * 1024 + 1 }
 * }));
 * ```
 */

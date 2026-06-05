import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { filtersToSearchParams, type VMFilters } from "./vmFilters";

export const DEFAULT_VM_FILTER_BASE_PATH = "/report/vms-overview";

export type NavigateToVMFilters = (filters: VMFilters) => void;

/** Navigates to the VMs tab with filters, using the page callback when provided. */
export function useChartDrillDown(
  onNavigateToVMFilters?: NavigateToVMFilters,
): (filters: VMFilters) => void {
  const navigate = useNavigate();

  return useCallback(
    (filters: VMFilters) => {
      if (onNavigateToVMFilters) {
        onNavigateToVMFilters(filters);
        return;
      }
      navigate(createVMFilterURL(filters));
    },
    [navigate, onNavigateToVMFilters],
  );
}

/**
 * Creates a URL to navigate to the Virtual Machines tab with specific filters
 * @param filters - The filters to apply
 * @param basePath - The base path (defaults to "/report/vms-overview")
 * @returns A URL string with the filters encoded
 */
export function createVMFilterURL(
  filters: VMFilters,
  basePath = DEFAULT_VM_FILTER_BASE_PATH,
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

export interface VMFilters {
  hasIssues?: boolean;
  noIssues?: boolean;
  statuses?: string[];
  clusters?: string[];
  datacenters?: string[];
  networks?: string[];
  search?: string;
  diskRange?: { min: number; max?: number };
  memoryRange?: { min: number; max?: number };
  migrationReadiness?: string[];
  vmLabels?: string[];
  concernLabels?: string[];
  concernCategories?: string[];
  showExcludedVMs?: boolean;
}

/**
 * Escapes single quotes in filter values to prevent expression syntax errors
 */
function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Converts VM filters to backend byExpression format
 * The backend expects an expression language documented in:
 * https://github.com/kubev2v/assisted-migration-agent/blob/main/docs/filter-by-expression.md
 */
export function filtersToByExpression(filters: VMFilters): string | undefined {
  const conditions: string[] = [];

  // Search filter - searches in VM name only
  if (filters.search) {
    conditions.push(`name like '${escapeFilterValue(filters.search)}'`);
  }

  // Status filter (powerstate field in backend)
  if (filters.statuses && filters.statuses.length > 0) {
    if (filters.statuses.length === 1) {
      conditions.push(`status = '${escapeFilterValue(filters.statuses[0])}'`);
    } else {
      const statusList = filters.statuses
        .map((s) => `'${escapeFilterValue(s)}'`)
        .join(",");
      conditions.push(`status in [${statusList}]`);
    }
  }

  // Cluster filter
  if (filters.clusters && filters.clusters.length > 0) {
    if (filters.clusters.length === 1) {
      conditions.push(`cluster = '${escapeFilterValue(filters.clusters[0])}'`);
    } else {
      const clusterList = filters.clusters
        .map((c) => `'${escapeFilterValue(c)}'`)
        .join(",");
      conditions.push(`cluster in [${clusterList}]`);
    }
  }

  // Datacenter filter
  if (filters.datacenters && filters.datacenters.length > 0) {
    if (filters.datacenters.length === 1) {
      conditions.push(
        `datacenter = '${escapeFilterValue(filters.datacenters[0])}'`,
      );
    } else {
      const datacenterList = filters.datacenters
        .map((d) => `'${escapeFilterValue(d)}'`)
        .join(",");
      conditions.push(`datacenter in [${datacenterList}]`);
    }
  }

  // Network filter
  if (filters.networks && filters.networks.length > 0) {
    if (filters.networks.length === 1) {
      conditions.push(
        `net.network = '${escapeFilterValue(filters.networks[0])}'`,
      );
    } else {
      const networkList = filters.networks
        .map((n) => `'${escapeFilterValue(n)}'`)
        .join(",");
      conditions.push(`net.network in [${networkList}]`);
    }
  }

  // Concern category filter (Critical, Warning, etc.)
  if (filters.concernCategories && filters.concernCategories.length > 0) {
    if (filters.concernCategories.length === 1) {
      conditions.push(
        `concern.category = '${escapeFilterValue(filters.concernCategories[0])}'`,
      );
    } else {
      const categoryList = filters.concernCategories
        .map((c) => `'${escapeFilterValue(c)}'`)
        .join(",");
      conditions.push(`concern.category in [${categoryList}]`);
    }
  }

  // Specific concern labels filter (can be combined with categories)
  if (filters.concernLabels && filters.concernLabels.length > 0) {
    if (filters.concernLabels.length === 1) {
      conditions.push(
        `concern.label = '${escapeFilterValue(filters.concernLabels[0])}'`,
      );
    } else {
      const concernList = filters.concernLabels
        .map((c) => `'${escapeFilterValue(c)}'`)
        .join(",");
      conditions.push(`concern.label in [${concernList}]`);
    }
  }

  // Generic issues filter - only apply if no specific concerns/categories selected
  const hasConcernFilters =
    (filters.concernCategories && filters.concernCategories.length > 0) ||
    (filters.concernLabels && filters.concernLabels.length > 0);

  if (!hasConcernFilters) {
    if (filters.hasIssues) {
      conditions.push("issues_count >= 1");
    } else if (filters.noIssues) {
      conditions.push("issues_count = 0");
    }
  }

  // Disk range filter (total_disk_capacity field, values in MB)
  if (filters.diskRange) {
    const { min, max } = filters.diskRange;
    if (max !== undefined) {
      conditions.push(
        `total_disk_capacity >= ${min} and total_disk_capacity <= ${max}`,
      );
    } else {
      conditions.push(`total_disk_capacity >= ${min}`);
    }
  }

  // Memory range filter (memory field, values in MB)
  if (filters.memoryRange) {
    const { min, max } = filters.memoryRange;
    if (max !== undefined) {
      conditions.push(`memory >= ${min} and memory <= ${max}`);
    } else {
      conditions.push(`memory >= ${min}`);
    }
  }

  // VM user-defined labels (array field; use contains; multiple = OR)
  if (filters.vmLabels && filters.vmLabels.length > 0) {
    if (filters.vmLabels?.length) {
      const condition = filters.vmLabels
        .map((label) => `labels contains '${escapeFilterValue(label)}'`)
        .join(" or ");

      conditions.push(`(${condition})`);
    }
  }

  // Migration readiness filter
  if (filters.migrationReadiness && filters.migrationReadiness.length > 0) {
    const hasReady = filters.migrationReadiness.includes("ready");
    const hasNotReady = filters.migrationReadiness.includes("not-ready");

    if (hasReady && !hasNotReady) {
      conditions.push("migratable = true");
    } else if (hasNotReady && !hasReady) {
      conditions.push("migratable = false");
    }
    // If both are selected, don't add a filter (show all)
  }

  if (filters.showExcludedVMs === false) {
    conditions.push("migration_excluded = false");
  } else if (filters.showExcludedVMs === true) {
    // Explicitly include excluded VMs. When byExpression is omitted, some agent
    // versions still apply a default that hides migration_excluded VMs.
    conditions.push(
      "(migration_excluded = true or migration_excluded = false)",
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return conditions.join(" and ");
}

/**
 * Converts VM filters to URL search params
 */
export function filtersToSearchParams(filters: VMFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.hasIssues !== undefined) {
    params.set("hasIssues", filters.hasIssues.toString());
  }

  if (filters.noIssues !== undefined) {
    params.set("noIssues", filters.noIssues.toString());
  }

  if (filters.statuses && filters.statuses.length > 0) {
    params.set("statuses", filters.statuses.join(","));
  }

  if (filters.clusters && filters.clusters.length > 0) {
    for (const cluster of filters.clusters) {
      params.append("clusters", cluster);
    }
  }

  if (filters.datacenters && filters.datacenters.length > 0) {
    params.set("datacenters", filters.datacenters.join(","));
  }

  if (filters.networks && filters.networks.length > 0) {
    for (const network of filters.networks) {
      params.append("networks", network);
    }
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.diskRange) {
    params.set("diskRangeMin", filters.diskRange.min.toString());
    if (filters.diskRange.max !== undefined) {
      params.set("diskRangeMax", filters.diskRange.max.toString());
    }
  }

  if (filters.memoryRange) {
    params.set("memoryRangeMin", filters.memoryRange.min.toString());
    if (filters.memoryRange.max !== undefined) {
      params.set("memoryRangeMax", filters.memoryRange.max.toString());
    }
  }

  if (filters.migrationReadiness && filters.migrationReadiness.length > 0) {
    params.set("migrationReadiness", filters.migrationReadiness.join(","));
  }

  if (filters.vmLabels && filters.vmLabels.length > 0) {
    params.set("vmLabels", filters.vmLabels.join(","));
  }

  if (filters.concernLabels && filters.concernLabels.length > 0) {
    filters.concernLabels.forEach((label) => {
      params.append("concernLabels", label);
    });
  }

  if (filters.concernCategories && filters.concernCategories.length > 0) {
    filters.concernCategories.forEach((category) => {
      params.append("concernCategories", category);
    });
  }

  return params;
}

/**
 * Parses URL search params to VM filters
 */
export function searchParamsToFilters(
  searchParams: URLSearchParams,
): VMFilters {
  const filters: VMFilters = {};

  const hasIssues = searchParams.get("hasIssues");
  if (hasIssues !== null) {
    filters.hasIssues = hasIssues === "true";
  }

  const noIssues = searchParams.get("noIssues");
  if (noIssues !== null) {
    filters.noIssues = noIssues === "true";
  }

  const statuses = searchParams.get("statuses");
  if (statuses) {
    filters.statuses = statuses.split(",").filter(Boolean);
  }

  const clusters = searchParams.getAll("clusters");
  if (clusters.length > 0) {
    filters.clusters = clusters.filter(Boolean);
  }

  const datacenters = searchParams.get("datacenters");
  if (datacenters) {
    filters.datacenters = datacenters.split(",").filter(Boolean);
  }

  const networks = searchParams.getAll("networks");
  if (networks.length > 0) {
    filters.networks = networks.filter(Boolean);
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const diskRangeMin = searchParams.get("diskRangeMin");
  const diskRangeMax = searchParams.get("diskRangeMax");
  if (diskRangeMin !== null) {
    const min = Number.parseInt(diskRangeMin, 10);
    if (!Number.isNaN(min)) {
      filters.diskRange = { min };
      if (diskRangeMax !== null) {
        const max = Number.parseInt(diskRangeMax, 10);
        if (!Number.isNaN(max)) {
          filters.diskRange.max = max;
        }
      }
    }
  }

  const memoryRangeMin = searchParams.get("memoryRangeMin");
  const memoryRangeMax = searchParams.get("memoryRangeMax");
  if (memoryRangeMin !== null) {
    const min = Number.parseInt(memoryRangeMin, 10);
    if (!Number.isNaN(min)) {
      filters.memoryRange = { min };
      if (memoryRangeMax !== null) {
        const max = Number.parseInt(memoryRangeMax, 10);
        if (!Number.isNaN(max)) {
          filters.memoryRange.max = max;
        }
      }
    }
  }

  const migrationReadiness = searchParams.get("migrationReadiness");
  if (migrationReadiness) {
    filters.migrationReadiness = migrationReadiness.split(",").filter(Boolean);
  }

  const vmLabels = searchParams.get("vmLabels");
  if (vmLabels) {
    filters.vmLabels = vmLabels.split(",").filter(Boolean);
  }

  const concernLabels = searchParams.getAll("concernLabels");
  if (concernLabels.length > 0) {
    filters.concernLabels = concernLabels.filter(Boolean);
  }

  const concernCategories = searchParams.getAll("concernCategories");
  if (concernCategories.length > 0) {
    filters.concernCategories = concernCategories.filter(Boolean);
  }

  return filters;
}

/**
 * Checks if any filters are applied
 */
export function hasActiveFilters(filters: VMFilters): boolean {
  return !!(
    filters.hasIssues !== undefined ||
    filters.noIssues !== undefined ||
    (filters.diskRange !== undefined && filters.diskRange !== null) ||
    (filters.memoryRange !== undefined && filters.memoryRange !== null) ||
    (filters.statuses && filters.statuses.length > 0) ||
    (filters.clusters && filters.clusters.length > 0) ||
    (filters.datacenters && filters.datacenters.length > 0) ||
    (filters.networks && filters.networks.length > 0) ||
    (filters.migrationReadiness && filters.migrationReadiness.length > 0) ||
    (filters.vmLabels && filters.vmLabels.length > 0) ||
    (filters.concernLabels && filters.concernLabels.length > 0) ||
    (filters.concernCategories && filters.concernCategories.length > 0) ||
    filters.search
  );
}

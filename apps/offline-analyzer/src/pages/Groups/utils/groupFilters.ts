function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/** Builds a filter expression that matches exactly the given VM IDs. */
export function vmIdsToFilterExpression(vmIds: string[]): string {
  if (vmIds.length === 0) {
    return "id in []";
  }
  if (vmIds.length === 1) {
    return `id = '${escapeFilterValue(vmIds[0])}'`;
  }
  const idList = vmIds.map((id) => `'${escapeFilterValue(id)}'`).join(",");
  return `id in [${idList}]`;
}

/** Combines two filter expressions with AND. */
export function combineFilterExpressions(
  base: string | undefined,
  extra: string | undefined,
): string | undefined {
  const parts = [base, extra].filter((part): part is string =>
    Boolean(part?.trim()),
  );
  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return `(${parts[0]}) and (${parts[1]})`;
}

/** Combines two filter expressions with OR. */
export function combineFilterExpressionsOr(
  base: string | undefined,
  extra: string | undefined,
): string | undefined {
  const parts = [base, extra].filter((part): part is string =>
    Boolean(part?.trim()),
  );
  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return `(${parts[0]}) or (${parts[1]})`;
}

/** Builds a filter expression that excludes the given VM IDs. */
export function vmIdsNotInFilterExpression(vmIds: string[]): string {
  if (vmIds.length === 0) {
    return "true";
  }
  if (vmIds.length === 1) {
    return `id != '${escapeFilterValue(vmIds[0])}'`;
  }
  const idList = vmIds.map((id) => `'${escapeFilterValue(id)}'`).join(",");
  return `id not in [${idList}]`;
}

const ID_IN_PATTERN = /^id\s+in\s+\[(.*)\]$/i;
const ID_EQ_PATTERN = /^id\s*=\s*'((?:\\'|[^'])*)'$/i;

/** Returns VM IDs when the filter is a simple id list; otherwise null. */
export function parseIdsFromFilter(filter: string): string[] | null {
  const trimmed = filter.trim();
  const inMatch = ID_IN_PATTERN.exec(trimmed);
  if (inMatch) {
    const inner = inMatch[1].trim();
    if (!inner) {
      return [];
    }
    return inner
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const quoted = part.match(/^'(.*)'$/);
        return quoted
          ? quoted[1].replace(/\\'/g, "'")
          : part.replace(/^"(.*)"$/, "$1");
      });
  }

  const eqMatch = ID_EQ_PATTERN.exec(trimmed);
  if (eqMatch) {
    return [eqMatch[1].replace(/\\'/g, "'")];
  }

  return null;
}

/** Adds VMs to a group's filter expression. */
export function addVmsToGroupFilter(
  currentFilter: string,
  vmIdsToAdd: string[],
): string {
  if (vmIdsToAdd.length === 0) {
    return currentFilter;
  }

  const existingIds = parseIdsFromFilter(currentFilter);
  if (existingIds !== null) {
    const merged = [...new Set([...existingIds, ...vmIdsToAdd])];
    return vmIdsToFilterExpression(merged);
  }

  const addition = vmIdsToFilterExpression(vmIdsToAdd);
  return combineFilterExpressionsOr(currentFilter, addition) ?? addition;
}

/** Removes VMs from a group's filter expression. */
export function removeVmsFromGroupFilter(
  currentFilter: string,
  vmIdsToRemove: string[],
): string {
  if (vmIdsToRemove.length === 0) {
    return currentFilter;
  }

  const existingIds = parseIdsFromFilter(currentFilter);
  if (existingIds !== null) {
    const removeSet = new Set(vmIdsToRemove);
    const remaining = existingIds.filter((id) => !removeSet.has(id));
    return vmIdsToFilterExpression(remaining);
  }

  const exclusion = vmIdsNotInFilterExpression(vmIdsToRemove);
  return combineFilterExpressions(currentFilter, exclusion) ?? exclusion;
}

/**
 * Builds an updated id-list filter from the group's current member VM IDs.
 * Prefer this over parsing the stored filter when removing explicit members.
 */
export function buildGroupFilterAfterRemovingMembers(
  currentMemberIds: string[],
  vmIdsToRemove: string[],
): string {
  const removeSet = new Set(vmIdsToRemove);
  const remaining = currentMemberIds.filter((id) => !removeSet.has(id));
  return vmIdsToFilterExpression(remaining);
}

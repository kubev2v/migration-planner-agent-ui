/**
 * Canonical cache tags scoped to a single group's detail view — the header
 * count (`Group`), the VM table (`GroupVms`) and the assessment inventory
 * (`GroupInventory`). Any write that changes a group's membership, or a VM
 * inside an open group detail page, must invalidate all three together so the
 * group's counts cannot diverge.
 *
 * This is the single source of truth for that set. Consumers spread it into
 * their own tag lists (an endpoint's `invalidatesTags` or an imperative
 * `agentApiSlice.util.invalidateTags`), adding fleet-level tags such as
 * `Group:LIST` or `Vms:LIST` as their context requires. Returns an empty tuple
 * when no group is in scope.
 */
export function groupChangeTags(groupId?: string) {
  if (!groupId) {
    return [] as const;
  }
  return [
    { type: "Group", id: groupId },
    { type: "GroupVms", id: groupId },
    { type: "GroupInventory", id: groupId },
  ] as const;
}

/** Tags for refreshing a group's header, VM list, and report inventory. */
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

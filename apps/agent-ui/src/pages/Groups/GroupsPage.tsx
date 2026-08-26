import type { Group } from "@openshift-migration-advisor/agent-sdk";
import { PageSection } from "@patternfly/react-core";
import type React from "react";
import { useEffect, useState } from "react";
import {
  useDeleteGroupMutation,
  useListGroupsQuery,
  useUpdateGroupNameMutation,
} from "../../store/api/groupsEndpoints";
import { GroupsTable } from "./components/GroupsTable";

import { CreateGroupModal } from "./components/modals/CreateGroupModal";
import { DeleteGroupModal } from "./components/modals/DeleteGroupModal";
import { EditGroupNameModal } from "./components/modals/EditGroupNameModal";

export const GroupsPage: React.FC = () => {
  const [updateGroupName] = useUpdateGroupNameMutation();
  const [deleteGroup] = useDeleteGroupMutation();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedNameFilter, setDebouncedNameFilter] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  // Debounce search input so API calls use debouncedNameFilter, not nameFilter.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameFilter]);

  // The server-side page of the list. A single GET; `Group:LIST` invalidation
  // (create/delete/rename/membership) refetches it, so it can never go stale.
  const { data: pageData, isLoading: loading } = useListGroupsQuery({
    byName: debouncedNameFilter || undefined,
    page,
    pageSize,
  });

  const groups = pageData?.groups ?? [];
  const total = pageData?.total ?? 0;

  const handleUpdateGroupName = async (name: string) => {
    if (!editingGroup) {
      return;
    }
    await updateGroupName({ groupId: editingGroup.id, name }).unwrap();
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) {
      return;
    }
    await deleteGroup({ groupId: deletingGroup.id }).unwrap();
  };

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <GroupsTable
        groups={groups}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        nameFilter={nameFilter}
        onNameFilterChange={setNameFilter}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        onCreateGroup={() => setIsCreateModalOpen(true)}
        onEditGroupName={setEditingGroup}
        onDeleteGroup={setDeletingGroup}
      />

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditGroupNameModal
        isOpen={!!editingGroup}
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onSave={handleUpdateGroupName}
      />

      <DeleteGroupModal
        isOpen={!!deletingGroup}
        group={deletingGroup}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleDeleteGroup}
      />
    </PageSection>
  );
};

GroupsPage.displayName = "GroupsPage";

import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  Group,
} from "@openshift-migration-advisor/agent-sdk";
import { PageSection } from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Symbols } from "../../main/Symbols";
import { CreateGroupModal } from "./components/CreateGroupModal";
import { DeleteGroupModal } from "./components/DeleteGroupModal";
import { EditGroupNameModal } from "./components/EditGroupNameModal";
import type { GroupRow } from "./components/GroupsTable";
import { GroupsTable } from "./components/GroupsTable";
import { fetchAllGroups } from "./components/groupList";

const GROUP_VM_PAGE_SIZE = 100;

async function enrichGroup(
  agentApi: DefaultApiInterface,
  group: Group,
): Promise<GroupRow> {
  const labelSet = new Set<string>();

  const firstPage = await agentApi.getGroup({
    id: group.id,
    page: 1,
    pageSize: GROUP_VM_PAGE_SIZE,
  });

  for (const vm of firstPage.vms) {
    if (vm.labels) {
      for (const label of vm.labels) {
        labelSet.add(label);
      }
    }
  }

  const pageCount = firstPage.pageCount ?? 1;
  for (let vmPage = 2; vmPage <= pageCount; vmPage++) {
    const response = await agentApi.getGroup({
      id: group.id,
      page: vmPage,
      pageSize: GROUP_VM_PAGE_SIZE,
    });
    for (const vm of response.vms) {
      if (vm.labels) {
        for (const label of vm.labels) {
          labelSet.add(label);
        }
      }
    }
  }

  return {
    ...group,
    vmCount: firstPage.total,
    labels: Array.from(labelSet).sort((a, b) => a.localeCompare(b)),
  };
}

export const GroupsPage: React.FC = () => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedNameFilter, setDebouncedNameFilter] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const requestIdRef = useRef(0);

  // Debounce search input so API calls use debouncedNameFilter, not nameFilter.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameFilter]);

  const fetchGroups = useCallback(async () => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    try {
      if (selectedLabels.length > 0) {
        const allRaw = await fetchAllGroups(agentApi, {
          byName: debouncedNameFilter || undefined,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const enriched = await Promise.all(
          allRaw.map((group) => enrichGroup(agentApi, group)),
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        const labelFiltered = enriched.filter((group) =>
          selectedLabels.every((label) => group.labels.includes(label)),
        );

        setGroups(labelFiltered);
        setTotal(labelFiltered.length);
        return;
      }

      const response = await agentApi.listGroups({
        byName: debouncedNameFilter || undefined,
        page,
        pageSize,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const enriched = await Promise.all(
        (response.groups || []).map((group) => enrichGroup(agentApi, group)),
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setGroups(enriched);
      setTotal(response.total || 0);
    } catch (err) {
      console.error("Error fetching groups:", err);
      if (requestId === requestIdRef.current) {
        setGroups([]);
        setTotal(0);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [agentApi, debouncedNameFilter, page, pageSize, selectedLabels]);

  // Refetch when debounced search, pagination, or label filters change — not on each keystroke.
  // loading is only true on initial mount; refetches keep the current list visible until new data arrives.
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const response = await agentApi.getVMLabels();
        setAvailableLabels(response.labels || []);
      } catch (err) {
        console.error("Error fetching VM labels:", err);
        setAvailableLabels([]);
      }
    };

    fetchLabels();
  }, [agentApi]);

  const displayedGroups = useMemo(() => {
    if (selectedLabels.length === 0) {
      return groups;
    }
    const start = (page - 1) * pageSize;
    return groups.slice(start, start + pageSize);
  }, [groups, page, pageSize, selectedLabels.length]);

  const handleUpdateGroupName = async (name: string) => {
    if (!editingGroup) {
      return;
    }
    await agentApi.updateGroup({
      id: editingGroup.id,
      updateGroupRequest: { name },
    });
    await fetchGroups();
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) {
      return;
    }
    await agentApi.deleteGroup({ id: deletingGroup.id });
    await fetchGroups();
  };

  return (
    <PageSection hasBodyWrapper={false} isFilled style={{ padding: "24px" }}>
      <GroupsTable
        groups={displayedGroups}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        nameFilter={nameFilter}
        selectedLabels={selectedLabels}
        availableLabels={availableLabels}
        onNameFilterChange={setNameFilter}
        onLabelsFilterChange={(labels) => {
          setSelectedLabels(labels);
          setPage(1);
        }}
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
        onCreated={fetchGroups}
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

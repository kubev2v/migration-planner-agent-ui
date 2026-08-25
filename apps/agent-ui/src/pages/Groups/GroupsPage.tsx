import type { Group } from "@openshift-migration-advisor/agent-sdk";
import { PageSection } from "@patternfly/react-core";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { DefaultApiInterface } from "../../api/agentApi";
import { useAgentApi } from "../../api/agentApiClient";
import {
  useDeleteGroupMutation,
  useListGroupsQuery,
  useUpdateGroupNameMutation,
} from "../../store/api/groupsEndpoints";
import { getVmTags } from "../VirtualMachinesOverview/virtualMachineParsing";
import type { GroupRow } from "./components/GroupsTable";
import { GroupsTable } from "./components/GroupsTable";

import { CreateGroupModal } from "./components/modals/CreateGroupModal";
import { DeleteGroupModal } from "./components/modals/DeleteGroupModal";
import { EditGroupNameModal } from "./components/modals/EditGroupNameModal";

const GROUP_VM_PAGE_SIZE = 100;
const GROUP_LIST_PAGE_SIZE = 100;

async function enrichGroup(
  agentApi: DefaultApiInterface,
  group: Group,
): Promise<GroupRow> {
  const labelSet = new Set<string>();

  const firstPage = await agentApi.getLatestGroup({
    groupId: group.id,
    page: 1,
    pageSize: GROUP_VM_PAGE_SIZE,
  });

  for (const vm of firstPage.vms) {
    for (const label of getVmTags(vm)) {
      labelSet.add(label);
    }
  }

  const pageCount = firstPage.pageCount ?? 1;
  for (let vmPage = 2; vmPage <= pageCount; vmPage++) {
    const response = await agentApi.getLatestGroup({
      groupId: group.id,
      page: vmPage,
      pageSize: GROUP_VM_PAGE_SIZE,
    });
    for (const vm of response.vms) {
      for (const label of getVmTags(vm)) {
        labelSet.add(label);
      }
    }
  }

  return {
    ...group,
    vmCount: firstPage.total,
    labels: Array.from(labelSet).sort((a, b) => a.localeCompare(b)),
  };
}

/** Fetches every group across all pages (used only for label filtering). */
async function fetchAllGroupsPaged(
  agentApi: DefaultApiInterface,
  byName?: string,
): Promise<Group[]> {
  const allGroups: Group[] = [];
  let page = 1;
  let pageCount = 1;
  while (page <= pageCount) {
    const response = await agentApi.listLatestGroups({
      byName,
      page,
      pageSize: GROUP_LIST_PAGE_SIZE,
    });
    allGroups.push(...(response.groups ?? []));
    pageCount = response.pageCount ?? 1;
    page++;
  }
  return allGroups;
}

export const GroupsPage: React.FC = () => {
  const agentApi = useAgentApi();
  const [updateGroupName] = useUpdateGroupNameMutation();
  const [deleteGroup] = useDeleteGroupMutation();

  const [enrichedGroups, setEnrichedGroups] = useState<GroupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [enriching, setEnriching] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedNameFilter, setDebouncedNameFilter] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  const usingLabelFilter = selectedLabels.length > 0;

  // Debounce search input so API calls use debouncedNameFilter, not nameFilter.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameFilter]);

  // Server-side page of the list. `Group:LIST` invalidation (create/delete/
  // rename/membership) refetches this, which re-runs enrichment below — so the
  // list can never go stale after a mutation. It also drives label-mode
  // re-enrichment: a refetch changes `pageData`, re-triggering the effect.
  const { data: pageData, isLoading: pageLoading } = useListGroupsQuery({
    byName: debouncedNameFilter || undefined,
    page,
    pageSize,
  });

  // Enrich groups with per-group VM counts and labels. Two modes:
  //  - no label filter: enrich the current server page.
  //  - label filter: fetch all groups, enrich, then filter by label locally.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setEnriching(true);
      try {
        if (usingLabelFilter) {
          const allRaw = await fetchAllGroupsPaged(
            agentApi,
            debouncedNameFilter || undefined,
          );
          const enriched = await Promise.all(
            allRaw.map((group) => enrichGroup(agentApi, group)),
          );
          if (cancelled) {
            return;
          }
          const labelFiltered = enriched.filter((group) =>
            selectedLabels.every((label) => group.labels.includes(label)),
          );
          setEnrichedGroups(labelFiltered);
          setTotal(labelFiltered.length);
          return;
        }

        const raw = pageData?.groups ?? [];
        const enriched = await Promise.all(
          raw.map((group) => enrichGroup(agentApi, group)),
        );
        if (cancelled) {
          return;
        }
        setEnrichedGroups(enriched);
        setTotal(pageData?.total ?? 0);
      } catch (err) {
        console.error("Error fetching groups:", err);
        if (!cancelled) {
          setEnrichedGroups([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setEnriching(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    agentApi,
    usingLabelFilter,
    debouncedNameFilter,
    selectedLabels,
    pageData,
  ]);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const response = await agentApi.getLatestVMLabels();
        setAvailableLabels(response.labels || []);
      } catch (err) {
        console.error("Error fetching VM labels:", err);
        setAvailableLabels([]);
      }
    };

    fetchLabels();
  }, [agentApi]);

  const displayedGroups = useMemo(() => {
    if (!usingLabelFilter) {
      return enrichedGroups;
    }
    const start = (page - 1) * pageSize;
    return enrichedGroups.slice(start, start + pageSize);
  }, [enrichedGroups, page, pageSize, usingLabelFilter]);

  // Keep the current list visible during refetches: only show the loading
  // state when there is nothing to display yet.
  const loading = (pageLoading || enriching) && enrichedGroups.length === 0;

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

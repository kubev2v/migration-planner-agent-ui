import type {
  Group,
  GroupResponse,
  VirtualMachineListResponse,
} from "@openshift-migration-advisor/agent-sdk";
import { combineFilterExpressions } from "../../pages/Groups/utils/groupFilters";
import { agentApiSlice } from "./agentApiSlice";

interface GetGroupArg {
  groupId: string;
}

interface GetGroupVMsArg {
  groupId: string;
  /** Group membership filter (from `group.filter`). */
  groupFilter?: string;
  /** User-applied table filters, already compiled to a `by` expression. */
  byExpression?: string;
  sort?: string[];
  page: number;
  pageSize: number;
}

interface UpdateGroupNameArg {
  groupId: string;
  name: string;
}

/**
 * Group + group-scoped VM endpoints. The header count (inventory + total) and
 * the table count (VM list total) are two separate queries invalidated by the
 * same tags, so a membership change refetches both — they cannot diverge.
 */
export const groupsEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
    // Header source: GroupResponse carries `inventory`, `total` and `group`.
    getGroup: build.query<GroupResponse, GetGroupArg>({
      query:
        ({ groupId }) =>
        (sdk) =>
          sdk.getLatestGroup({ groupId, page: 1, pageSize: 1 }),
      providesTags: (_result, _error, { groupId }) => [
        { type: "Group", id: groupId },
        { type: "GroupInventory", id: groupId },
      ],
    }),

    // Table source: paginated VM list scoped to the group's filter.
    getGroupVMs: build.query<VirtualMachineListResponse, GetGroupVMsArg>({
      query:
        ({ groupFilter, byExpression, sort, page, pageSize }) =>
        (sdk) =>
          sdk.listLatestVirtualMachines({
            byExpression: combineFilterExpressions(groupFilter, byExpression),
            sort: sort && sort.length > 0 ? sort : undefined,
            page,
            pageSize,
          }),
      providesTags: (_result, _error, { groupId }) => [
        { type: "GroupVms", id: groupId },
      ],
    }),

    updateGroupName: build.mutation<Group, UpdateGroupNameArg>({
      query:
        ({ groupId, name }) =>
        (sdk) =>
          sdk.updateLatestGroup({
            groupId,
            updateGroupRequest: { name },
          }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Group", id: groupId },
      ],
    }),

    deleteGroup: build.mutation<void, { groupId: string }>({
      query:
        ({ groupId }) =>
        async (sdk) => {
          await sdk.deleteLatestGroup({ groupId });
        },
    }),
  }),
});

export const {
  useGetGroupQuery,
  useGetGroupVMsQuery,
  useUpdateGroupNameMutation,
  useDeleteGroupMutation,
} = groupsEndpoints;

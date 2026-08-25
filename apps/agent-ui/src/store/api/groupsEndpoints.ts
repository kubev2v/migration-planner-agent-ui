import type {
  CreateGroupRequest,
  Group,
  GroupListResponse,
  GroupResponse,
  VirtualMachineListResponse,
} from "@openshift-migration-advisor/agent-sdk";
import { combineFilterExpressions } from "../../pages/Groups/utils/groupFilters";
import { agentApiSlice } from "./agentApiSlice";

interface GetGroupArg {
  groupId: string;
}

interface ListGroupsArg {
  /** Case-insensitive substring match on the group name. */
  byName?: string;
  page: number;
  pageSize: number;
}

interface CreateGroupArg {
  createGroupRequest: CreateGroupRequest;
}

interface ChangeGroupMembershipArg {
  groupId: string;
  /** New membership filter expression for the group. */
  filter: string;
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
    // The groups list. `Group:LIST` is invalidated by every group create,
    // delete, rename and membership change, so the list can never go stale.
    listGroups: build.query<GroupListResponse, ListGroupsArg>({
      query:
        ({ byName, page, pageSize }) =>
        (sdk) =>
          sdk.listLatestGroups({ byName, page, pageSize }),
      providesTags: (result) => [
        { type: "Group", id: "LIST" },
        ...(result?.groups ?? []).map((group) => ({
          type: "Group" as const,
          id: group.id,
        })),
      ],
    }),

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

    createGroup: build.mutation<Group, CreateGroupArg>({
      query:
        ({ createGroupRequest }) =>
        (sdk) =>
          sdk.createLatestGroup({ createGroupRequest }),
      invalidatesTags: [{ type: "Group", id: "LIST" }],
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
        { type: "Group", id: "LIST" },
        { type: "Group", id: groupId },
      ],
    }),

    // Add/remove VMs by rewriting the group's membership filter. Invalidates the
    // list plus the specific group's detail tags so an open GroupDetailPage
    // (header count + VM table) refetches together and cannot diverge.
    changeGroupMembership: build.mutation<Group, ChangeGroupMembershipArg>({
      query:
        ({ groupId, filter }) =>
        (sdk) =>
          sdk.updateLatestGroup({
            groupId,
            updateGroupRequest: { filter },
          }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Group", id: "LIST" },
        { type: "Group", id: groupId },
        { type: "GroupVms", id: groupId },
        { type: "GroupInventory", id: groupId },
      ],
    }),

    deleteGroup: build.mutation<void, { groupId: string }>({
      query:
        ({ groupId }) =>
        async (sdk) => {
          await sdk.deleteLatestGroup({ groupId });
        },
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Group", id: "LIST" },
        { type: "Group", id: groupId },
      ],
    }),
  }),
});

export const {
  useListGroupsQuery,
  useGetGroupQuery,
  useGetGroupVMsQuery,
  useCreateGroupMutation,
  useUpdateGroupNameMutation,
  useChangeGroupMembershipMutation,
  useDeleteGroupMutation,
} = groupsEndpoints;

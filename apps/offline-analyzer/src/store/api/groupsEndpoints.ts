import type {
  CreateGroupRequest,
  Group,
  GroupListResponse,
  GroupResponse,
  VirtualMachineListResponse,
} from "@openshift-migration-advisor/agent-sdk";
import { combineFilterExpressions } from "../../pages/Groups/utils/groupFilters";
import { fetchAllGroupsPages } from "../../pages/Groups/utils/groupList";
import {
  buildVmGroupMembership,
  type VmGroupMembershipData,
} from "../../pages/Groups/utils/vmGroupMembership";
import { agentApiSlice } from "./agentApiSlice";

interface ListGroupsArg {
  byName?: string;
  page: number;
  pageSize: number;
}

interface GetGroupArg {
  groupId: string;
}

interface GetGroupVMsArg {
  groupId: string;
  groupFilter?: string;
  byExpression?: string;
  sort?: string[];
  page: number;
  pageSize: number;
}

interface CreateGroupArg {
  createGroupRequest: CreateGroupRequest;
}

interface UpdateGroupNameArg {
  groupId: string;
  name: string;
}

interface ChangeGroupMembershipArg {
  groupId: string;
  filter: string;
}

/** Group list and detail operations used by the Offline Analyzer. */
export const groupsEndpoints = agentApiSlice.injectEndpoints({
  endpoints: (build) => ({
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

    getAllGroups: build.query<Group[], void>({
      query: () => (sdk) => fetchAllGroupsPages(sdk),
      providesTags: (result) => [
        { type: "Group", id: "LIST" },
        ...(result ?? []).map((group) => ({
          type: "Group" as const,
          id: group.id,
        })),
      ],
    }),

    getVmGroupMembership: build.query<VmGroupMembershipData, void>({
      query: () => (sdk) => buildVmGroupMembership(sdk),
      providesTags: [{ type: "Group", id: "LIST" }],
    }),

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
        { type: "Vms", id: "LIST" },
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
  useGetAllGroupsQuery,
  useGetVmGroupMembershipQuery,
  useGetGroupQuery,
  useGetGroupVMsQuery,
  useCreateGroupMutation,
  useUpdateGroupNameMutation,
  useChangeGroupMembershipMutation,
  useDeleteGroupMutation,
} = groupsEndpoints;

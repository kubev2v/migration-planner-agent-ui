import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import { vmIdsToFilterExpression } from "../../../Groups/utils/groupFilters";
import {
  collectVmIdsUnderInspection,
  isVmUnderInspection,
} from "./vmInspectionUtils";

const VM_FETCH_PAGE_SIZE = 100;

/** Fetches every VM matching the given query (all pages). */
export async function fetchAllMatchingVms(
  agentApi: DefaultApiInterface,
  options: {
    byExpression?: string;
    sort?: string[];
  },
): Promise<VirtualMachine[]> {
  const firstPage = await agentApi.getVMs({
    byExpression: options.byExpression,
    sort: options.sort,
    page: 1,
    pageSize: VM_FETCH_PAGE_SIZE,
  });

  const vms = [...firstPage.vms];
  const pageCount = firstPage.pageCount ?? 1;

  for (let page = 2; page <= pageCount; page++) {
    const response = await agentApi.getVMs({
      byExpression: options.byExpression,
      sort: options.sort,
      page,
      pageSize: VM_FETCH_PAGE_SIZE,
    });
    vms.push(...response.vms);
  }

  return vms;
}

/** Fetches VM records for the given IDs (all pages if needed). */
export async function fetchVmsByIds(
  agentApi: DefaultApiInterface,
  vmIds: string[],
): Promise<VirtualMachine[]> {
  if (vmIds.length === 0) {
    return [];
  }
  return fetchAllMatchingVms(agentApi, {
    byExpression: vmIdsToFilterExpression(vmIds),
  });
}

/** Returns IDs for every VM currently pending or running deep inspection. */
export async function fetchVmIdsUnderInspection(
  agentApi: DefaultApiInterface,
  knownVms: VirtualMachine[] = [],
): Promise<string[]> {
  const ids = new Set(collectVmIdsUnderInspection(knownVms));

  let page = 1;
  let pageCount = 1;
  do {
    const response = await agentApi.getVMs({
      page,
      pageSize: VM_FETCH_PAGE_SIZE,
    });
    for (const vm of response.vms) {
      if (isVmUnderInspection(vm)) {
        ids.add(vm.id);
      }
    }
    pageCount = response.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return [...ids];
}

/** Fetches IDs for every VM matching the given query (all pages). */
export async function fetchAllMatchingVmIds(
  agentApi: DefaultApiInterface,
  options: {
    byExpression?: string;
    sort?: string[];
  },
): Promise<string[]> {
  const vms = await fetchAllMatchingVms(agentApi, options);
  return vms.map((vm) => vm.id);
}

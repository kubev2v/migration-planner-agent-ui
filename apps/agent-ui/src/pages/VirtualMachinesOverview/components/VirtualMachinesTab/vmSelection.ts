import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";

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

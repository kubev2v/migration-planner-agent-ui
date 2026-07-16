import type {
  ApplicationOverview,
  DefaultApiInterface,
} from "@openshift-migration-advisor/agent-sdk";
import { useCallback, useEffect, useState } from "react";
import { scopeApplicationsToVms } from "./components/ApplicationsTab/applicationsApi";
import { fetchAllMatchingVmIds } from "./components/VirtualMachinesTab/vmSelection";

interface UseApplicationsDataResult {
  applications: ApplicationOverview[];
  loading: boolean;
  error: string | null;
  refreshApplications: () => Promise<void>;
}

/** Loads applications when the tab is active; optionally scopes to a VM filter expression. */
export function useApplicationsData(
  agentApi: DefaultApiInterface,
  active: boolean,
  scopeExpression?: string,
): UseApplicationsDataResult {
  const [applications, setApplications] = useState<ApplicationOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await agentApi.getApplications();
      const data = response.applications ?? [];

      let scoped = data;
      if (scopeExpression) {
        const vmIds = await fetchAllMatchingVmIds(agentApi, {
          byExpression: scopeExpression,
        });
        scoped = scopeApplicationsToVms(data, new Set(vmIds));
      }

      setApplications(scoped);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setApplications([]);
      setError(
        err instanceof Error ? err.message : "Failed to load applications.",
      );
    } finally {
      setLoading(false);
    }
  }, [agentApi, scopeExpression]);

  useEffect(() => {
    if (!active) {
      return;
    }

    void loadApplications();
  }, [active, loadApplications]);

  const refreshApplications = useCallback(async () => {
    if (!active) {
      return;
    }
    await loadApplications();
  }, [active, loadApplications]);

  return { applications, loading, error, refreshApplications };
}

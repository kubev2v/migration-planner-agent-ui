import type {
  ApplicationOverview,
  DefaultApiInterface,
} from "@openshift-migration-advisor/agent-sdk";
import { useEffect, useState } from "react";
import { scopeApplicationsToVms } from "./components/applicationsApi";
import { fetchAllMatchingVmIds } from "./components/vmSelection";

interface UseApplicationsDataResult {
  applications: ApplicationOverview[];
  loading: boolean;
  error: string | null;
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

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const load = async () => {
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

        if (!cancelled) {
          setApplications(scoped);
        }
      } catch (err) {
        console.error("Error fetching applications:", err);
        if (!cancelled) {
          setApplications([]);
          setError(
            err instanceof Error ? err.message : "Failed to load applications.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [active, agentApi, scopeExpression]);

  return { applications, loading, error };
}

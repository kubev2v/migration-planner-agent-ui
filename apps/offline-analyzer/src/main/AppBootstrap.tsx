import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Spinner,
} from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useListCollectionsQuery } from "../store/api/comparisonEndpoints";
import { useGetAgentStatusQuery } from "../store/api/lifecycleEndpoints";

/**
 * Startup gate: loads the only data the app needs to decide its initial route —
 * the agent status and the list of collections — before anything else mounts.
 *
 * This component is the single subscriber for those two cache entries. Because
 * the router (and every page) only mounts once both requests have succeeded,
 * downstream consumers read the fulfilled cache instead of re-issuing their own
 * requests. When the backend is unreachable, we stop at the error screen rather
 * than mounting pages that would each retry the failing calls.
 */
export const AppBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const agentStatus = useGetAgentStatusQuery();
  const collections = useListCollectionsQuery();

  const ready =
    agentStatus.data !== undefined && collections.data !== undefined;

  if (!ready && (agentStatus.isError || collections.isError)) {
    const retry = (): void => {
      void agentStatus.refetch();
      void collections.refetch();
    };
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to reach the appliance backend"
          status="danger"
        >
          <EmptyStateBody>
            Check that it is running and try again.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={retry}>
                Retry
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!ready) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading application" />
      </Bullseye>
    );
  }

  return <>{children}</>;
};

AppBootstrap.displayName = "AppBootstrap";

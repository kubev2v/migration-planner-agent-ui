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

/**
 * Startup gate: ensures we can reach the analyzer (`GET /collections`) before the
 * router mounts. Offline analyzer is always RVTools mode — no agent `/agent` status
 * probe (appliance-only SDK surface).
 */
export const AppBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const collections = useListCollectionsQuery();

  const ready = collections.data !== undefined;

  if (!ready && collections.isError) {
    const retry = (): void => {
      void collections.refetch();
    };
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to reach the analyzer backend"
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

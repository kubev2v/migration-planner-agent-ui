import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import type React from "react";

export interface StorageOffloadEmptyStateProps {
  onGetStarted: () => void;
}

export const StorageOffloadEmptyState: React.FC<
  StorageOffloadEmptyStateProps
> = ({ onGetStarted }) => (
  <Bullseye style={{ minHeight: "400px" }}>
    <EmptyState
      titleText="No storage offload estimate run"
      headingLevel="h4"
      icon={SearchIcon}
    >
      <EmptyStateBody>
        Run a storage offload estimate to get expected migration time between
        vSphere datastore pairs.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button variant="primary" onClick={onGetStarted}>
          Get started
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

StorageOffloadEmptyState.displayName = "StorageOffloadEmptyState";

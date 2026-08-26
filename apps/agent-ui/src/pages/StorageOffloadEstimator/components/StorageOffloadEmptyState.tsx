import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Tooltip,
} from "@patternfly/react-core";
import { SearchIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCredentialsModal } from "../../../credentials/CredentialsModalController";
import { useCapability } from "../../../credentials/useCapability";

export interface StorageOffloadEmptyStateProps {
  onGetStarted: () => void;
}

export const StorageOffloadEmptyState: React.FC<
  StorageOffloadEmptyStateProps
> = ({ onGetStarted }) => {
  const {
    shouldShowTooltip,
    shouldRequestCredentials,
    errorTooltipContent,
    isPending,
  } = useCapability("forecaster");
  const { openCredentialsModal } = useCredentialsModal();

  return (
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
          {shouldShowTooltip ? (
            <Tooltip content={errorTooltipContent}>
              <Button variant="primary" isAriaDisabled>
                Get started
              </Button>
            </Tooltip>
          ) : (
            <Button
              variant="primary"
              isDisabled={isPending}
              onClick={() => {
                if (shouldRequestCredentials) {
                  openCredentialsModal(() => onGetStarted());
                } else {
                  onGetStarted();
                }
              }}
            >
              Get started
            </Button>
          )}
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};

StorageOffloadEmptyState.displayName = "StorageOffloadEmptyState";

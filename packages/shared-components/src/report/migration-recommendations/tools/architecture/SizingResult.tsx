import { css } from "@emotion/css";
import {
  Alert,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  List,
  ListItem,
  Spinner,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import type { FC } from "react";

import type { ClusterRequirementsResponseLike } from "./clusterRequirementsResponseLike.js";
import {
  formatNumber,
  formatRatio,
  getCpuOvercommitLabel,
  getMemoryOvercommitLabel,
} from "./sizingFormatters.js";
import {
  isControlPlaneOnlyClusterMode,
  type SizingFormValues,
} from "./sizingFormTypes.js";
import { UtilizationComparisonCards } from "./UtilizationComparisonCards.js";
import {
  getOptimizationStatusMessage,
  hasUtilizationComparison,
} from "./utilizationSizing.js";

const descriptionListStyles = css`
  .pf-v6-c-description-list__term {
    min-width: 250px;
    width: auto;
  }
`;

export interface SizingResultProps {
  clusterName: string;
  formValues: SizingFormValues;
  sizerOutput: ClusterRequirementsResponseLike | null;
  isLoading?: boolean;
  error?: Error | null;
}

export const SizingResult: FC<SizingResultProps> = ({
  clusterName,
  formValues,
  sizerOutput,
  isLoading = false,
  error = null,
}) => {
  if (isLoading) {
    return (
      <Stack hasGutter>
        <StackItem>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            justifyContent={{ default: "justifyContentCenter" }}
            style={{ minHeight: "200px" }}
          >
            <FlexItem>
              <Spinner size="lg" aria-label="Loading recommendations" />
            </FlexItem>
          </Flex>
        </StackItem>
      </Stack>
    );
  }

  if (error) {
    const firstChar = error.message.charAt(0);
    const message = firstChar
      ? firstChar.toUpperCase() + error.message.slice(1)
      : error.message;

    return (
      <Stack hasGutter>
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title="Failed to calculate sizing recommendation"
          >
            {message}
          </Alert>
        </StackItem>
      </Stack>
    );
  }

  if (!sizerOutput) {
    return (
      <Stack hasGutter>
        <StackItem>
          <p>No sizing data available.</p>
        </StackItem>
      </Stack>
    );
  }

  const isSNO = isControlPlaneOnlyClusterMode(formValues.clusterMode);
  const showUtilizationComparison = hasUtilizationComparison(sizerOutput);
  const displaySizing =
    showUtilizationComparison && sizerOutput.optimizedSizing
      ? sizerOutput.optimizedSizing
      : sizerOutput.clusterSizing;
  const hasControlPlane = displaySizing.controlPlaneNodes > 0;
  const optimizationStatusMessage = getOptimizationStatusMessage(sizerOutput);

  // Extract optional fields with defaults (only needed for non-SNO modes)
  const cpuOverCommitRatio =
    sizerOutput.resourceConsumption.overCommitRatio?.cpu;
  const memoryOverCommitRatio =
    sizerOutput.resourceConsumption.overCommitRatio?.memory;
  const cpuLimits = sizerOutput.resourceConsumption.limits?.cpu;
  const memoryLimits = sizerOutput.resourceConsumption.limits?.memory;

  return (
    <Stack hasGutter>
      {hasUtilizationComparison(sizerOutput) && (
        <StackItem>
          <UtilizationComparisonCards
            sizerOutput={sizerOutput}
            formValues={formValues}
          />
        </StackItem>
      )}
      {optimizationStatusMessage && (
        <StackItem>
          <Alert isInline variant="info" title="100% allocation sizing">
            {optimizationStatusMessage}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <DescriptionList
          isHorizontal
          isCompact
          className={descriptionListStyles}
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Cluster name</DescriptionListTerm>
            <DescriptionListDescription>
              {clusterName}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Target platform</DescriptionListTerm>
            <DescriptionListDescription>Bare metal</DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Total nodes</DescriptionListTerm>
            <DescriptionListDescription>
              {isSNO ? (
                displaySizing.totalNodes
              ) : (
                <>
                  {displaySizing.totalNodes} ({displaySizing.workerNodes}{" "}
                  workers + {displaySizing.controlPlaneNodes} control plane)
                </>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>

          {!isSNO && (
            <DescriptionListGroup>
              <DescriptionListTerm>Failover Capacity</DescriptionListTerm>
              <DescriptionListDescription>
                {displaySizing.failoverNodes} failover nodes
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          <DescriptionListGroup>
            <DescriptionListTerm>Node size</DescriptionListTerm>
            <DescriptionListDescription>
              {isSNO ? (
                `${formValues.controlPlaneCpu} CPU, ${formValues.controlPlaneMemoryGb} GB memory`
              ) : hasControlPlane ? (
                <List isPlain>
                  <ListItem>
                    Worker: {formValues.customCpu} CPU,{" "}
                    {formValues.customMemoryGb} GB memory
                  </ListItem>
                  <ListItem>
                    Control Plane: {formValues.controlPlaneCpu} CPU,{" "}
                    {formValues.controlPlaneMemoryGb} GB memory
                  </ListItem>
                </List>
              ) : (
                `${formValues.customCpu} CPU, ${formValues.customMemoryGb} GB memory`
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>

          {!isSNO && (
            <DescriptionListGroup>
              <DescriptionListTerm>Overcommitment</DescriptionListTerm>
              <DescriptionListDescription>
                CPU {getCpuOvercommitLabel(formValues.cpuOvercommitRatio)},
                Memory{" "}
                {getMemoryOvercommitLabel(formValues.memoryOvercommitRatio)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}

          <DescriptionListGroup>
            <DescriptionListTerm>Workload details</DescriptionListTerm>
            <DescriptionListDescription>
              {isSNO ? (
                <>
                  VMs to migrate:{" "}
                  {formatNumber(sizerOutput.inventoryTotals.totalVMs)}
                </>
              ) : (
                <List isPlain>
                  <ListItem>
                    VMs to migrate:{" "}
                    {formatNumber(sizerOutput.inventoryTotals.totalVMs)}
                  </ListItem>
                  {cpuOverCommitRatio != null ? (
                    <ListItem>
                      CPU over-commit ratio: {formatRatio(cpuOverCommitRatio)}
                    </ListItem>
                  ) : null}
                  {memoryOverCommitRatio != null ? (
                    <ListItem>
                      Memory over-commit ratio:{" "}
                      {formatRatio(memoryOverCommitRatio)}
                    </ListItem>
                  ) : null}
                </List>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Resources</DescriptionListTerm>
            <DescriptionListDescription>
              {isSNO ? (
                <>
                  VM resources (request):{" "}
                  {formatNumber(sizerOutput.inventoryTotals.totalCPU)} CPU,{" "}
                  {formatNumber(sizerOutput.inventoryTotals.totalMemory)} GB
                  memory
                </>
              ) : (
                <List isPlain>
                  <ListItem>
                    VM resources (request):{" "}
                    {formatNumber(sizerOutput.inventoryTotals.totalCPU)} CPU,{" "}
                    {formatNumber(sizerOutput.inventoryTotals.totalMemory)} GB
                    memory
                  </ListItem>
                  {cpuLimits != null && memoryLimits != null ? (
                    <ListItem>
                      With Over-commit (limits): {formatNumber(cpuLimits)} CPU,{" "}
                      {formatNumber(memoryLimits)} GB memory
                    </ListItem>
                  ) : null}
                  <ListItem>
                    Physical capacity: {formatNumber(displaySizing.totalCPU)}{" "}
                    CPU, {formatNumber(displaySizing.totalMemory)} GB memory
                  </ListItem>
                </List>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};

SizingResult.displayName = "SizingResult";

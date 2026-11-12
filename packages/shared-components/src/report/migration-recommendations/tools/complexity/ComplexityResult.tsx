import { css } from "@emotion/css";
import {
  ChartPie,
  ChartTooltip,
} from "@patternfly/react-charts/dist/esm/victory/index.js";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { FC } from "react";
import { useMemo, useState } from "react";

import {
  themedChartTooltipFlyoutPadding,
  themedChartTooltipFlyoutStyle,
  themedChartTooltipStyle,
} from "../../../../charts/chartTooltipStyles.js";
import { durationToHours } from "../time-estimation/timeUtils.js";
import {
  COMPLEXITY_COLORS,
  getComplexityBadgeStyle,
  getComplexityLabel,
} from "./complexityConstants.js";
import type {
  ComplexityDiskScoreEntryLike,
  ComplexityOSNameEntryLike,
  MigrationComplexityResponseLike,
  MigrationEstimationByComplexityResponseLike,
  OsDiskEstimationEntryLike,
  SchemaEstimationResultLike,
} from "./complexityTypes.js";
import { OsComplexityChart } from "./OsComplexityChart.js";
import {
  limitOsChartData,
  OS_CHART_MAX_BARS,
  sortComplexityOsData,
} from "./osComplexityChartData.js";

export interface ComplexityResultProps {
  clusterName: string;
  complexityOutput: MigrationComplexityResponseLike | null;
  isLoading: boolean;
  error: Error | null;
  estimationByComplexity: MigrationEstimationByComplexityResponseLike | null;
  isLoadingEstimationByComplexity: boolean;
  estimationByComplexityError: Error | null;
}

interface ChartDatum {
  x: string;
  y: number;
}

const headerStyle = css`
  margin-bottom: var(--pf-t--global--spacer--200);
`;

const legendContainerStyle = css`
  display: flex;
  gap: var(--pf-t--global--spacer--200);
  margin-bottom: var(--pf-t--global--spacer--400);
  flex-wrap: wrap;
`;

const toggleGroupStyle = css`
  margin-bottom: var(--pf-t--global--spacer--500);
`;

const chartCaptionStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: var(--pf-t--global--font--size--sm);
  margin-bottom: var(--pf-t--global--spacer--200);
`;

const tableHeaderStyle = css`
  font-weight: 500;
`;

const chartPieContainerStyle = css`
  overflow: visible;
  min-height: 350px;
  display: flex;
  justify-content: flex-start;
  margin-bottom: var(--pf-t--global--spacer--600);
  margin-left: 30%;
`;

const formatNumber = (value: number): string => value.toLocaleString();

const formatPercentage = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

// Disk size tier labels based on score
const DISK_SIZE_LABELS: Record<number, string> = {
  1: "0-10 TB",
  2: "11-20 TB",
  3: "21-50 TB",
  4: "> 50 TB",
};

const formatDiskSize = (tb: number): string => {
  if (tb === 0) return "0 TB";
  return `${tb.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} TB`;
};

const timeEstimationCellStyle = css`
  display: flex;
  flex-direction: column;
  gap: var(--pf-t--global--spacer--100);
`;

const timeEstimationLabelStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: var(--pf-t--global--font--size--xs);
`;

const timeEstimationValueStyle = css`
  font-weight: var(--pf-t--global--font--weight--body--bold);
`;

const ComplexityOsTab: FC<{
  osNameData: ComplexityOSNameEntryLike[];
  totalVMs: number;
}> = ({ osNameData, totalVMs }) => {
  const sortedOSData = useMemo(
    () => sortComplexityOsData(osNameData),
    [osNameData],
  );
  const chartOsData = useMemo(
    () => limitOsChartData(sortedOSData),
    [sortedOSData],
  );
  const hiddenOsCount = sortedOSData.length - chartOsData.length;

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3">Migration complexity by OS</Title>
      </StackItem>

      {hiddenOsCount > 0 ? (
        <StackItem>
          <p className={chartCaptionStyle}>
            Showing {OS_CHART_MAX_BARS} of {sortedOSData.length} operating
            systems. The full list is in the table below.
          </p>
        </StackItem>
      ) : null}

      <StackItem>
        <OsComplexityChart data={chartOsData} />
      </StackItem>

      <StackItem>
        <div className={tableHeaderStyle}>Detailed breakdown</div>
        <Table aria-label="Complexity by OS table" variant="compact">
          <Thead>
            <Tr>
              <Th>Operating system</Th>
              <Th>Complexity</Th>
              <Th>Count</Th>
              <Th>Percentage</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedOSData.map((item: ComplexityOSNameEntryLike) => (
              <Tr key={`${item.osName}-${item.score}-${item.vmCount}`}>
                <Td>{item.osName}</Td>
                <Td>
                  <Badge style={getComplexityBadgeStyle(item.score)}>
                    {getComplexityLabel(item.score)}
                  </Badge>
                </Td>
                <Td>{formatNumber(item.vmCount)}</Td>
                <Td>
                  {totalVMs > 0
                    ? `${formatPercentage((item.vmCount / totalVMs) * 100)}%`
                    : "0%"}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </StackItem>
    </Stack>
  );
};

ComplexityOsTab.displayName = "ComplexityOsTab";

export const ComplexityResult: FC<ComplexityResultProps> = ({
  clusterName,
  complexityOutput,
  isLoading,
  error,
  estimationByComplexity,
  isLoadingEstimationByComplexity,
  estimationByComplexityError,
}) => {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);

  if (isLoading) {
    return (
      <Stack hasGutter>
        <StackItem>
          <Spinner
            size="lg"
            aria-label="Calculating migration complexity estimation"
          />
        </StackItem>
        <StackItem>
          <p>
            Calculating migration complexity estimation for {clusterName}...
          </p>
        </StackItem>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" isInline title="Calculation failed">
        {error.message}
      </Alert>
    );
  }

  if (!complexityOutput) {
    return null;
  }

  const osNameData = complexityOutput.complexityByOSName;
  const totalVMs = osNameData.reduce(
    (sum: number, item: ComplexityOSNameEntryLike) => sum + item.vmCount,
    0,
  );

  // Render By Disk tab content
  const renderByDiskTab = () => {
    const diskData = complexityOutput.complexityByDisk.filter(
      (item: ComplexityDiskScoreEntryLike) => item.vmCount > 0,
    );
    const totalDiskVMs = diskData.reduce(
      (sum: number, item: ComplexityDiskScoreEntryLike) => sum + item.vmCount,
      0,
    );

    return (
      <Stack hasGutter>
        <StackItem>
          <div className={headerStyle}>
            <Title headingLevel="h3">Distribution by disk size</Title>
          </div>
        </StackItem>

        <StackItem>
          <div className={chartPieContainerStyle}>
            {diskData.length > 0 ? (
              <ChartPie
                ariaDesc="Pie chart showing VM distribution by disk size tier"
                data={diskData.map((item) => ({
                  x: DISK_SIZE_LABELS[item.score],
                  y: item.vmCount,
                }))}
                labels={({ datum }) => {
                  const d = datum as ChartDatum;
                  const diskEntry = complexityOutput.complexityByDisk.find(
                    (item) => DISK_SIZE_LABELS[item.score] === d.x,
                  );
                  const score = diskEntry?.score || 0;
                  return `${d.x}\n${getComplexityLabel(score)}\n${d.y}`;
                }}
                labelComponent={
                  <ChartTooltip
                    style={{ ...themedChartTooltipStyle, fontSize: 14 }}
                    flyoutStyle={themedChartTooltipFlyoutStyle}
                    flyoutPadding={themedChartTooltipFlyoutPadding}
                  />
                }
                padding={{ bottom: 20, left: 20, right: 20, top: 20 }}
                height={350}
                width={350}
                colorScale={diskData.map(
                  (item) => COMPLEXITY_COLORS[item.score],
                )}
              />
            ) : (
              <div>No data available</div>
            )}
          </div>
        </StackItem>

        <StackItem>
          <div className={tableHeaderStyle}>Detailed breakdown</div>
          <Table aria-label="Complexity by disk table" variant="compact">
            <Thead>
              <Tr>
                <Th>Disk size</Th>
                <Th>Complexity</Th>
                <Th>Count</Th>
                <Th>Percentage</Th>
              </Tr>
            </Thead>
            <Tbody>
              {diskData.map((item) => (
                <Tr key={item.score}>
                  <Td>{DISK_SIZE_LABELS[item.score]}</Td>
                  <Td>
                    <Badge style={getComplexityBadgeStyle(item.score)}>
                      {getComplexityLabel(item.score)}
                    </Badge>
                  </Td>
                  <Td>{formatNumber(item.vmCount)}</Td>
                  <Td>
                    {totalDiskVMs > 0
                      ? `${formatPercentage((item.vmCount / totalDiskVMs) * 100)}%`
                      : "0%"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </StackItem>
      </Stack>
    );
  };

  // Render By Disk & OS tab content
  const renderByDiskAndOSTab = () => {
    if (isLoadingEstimationByComplexity) {
      return (
        <Stack hasGutter>
          <StackItem>
            <Spinner
              size="lg"
              aria-label="Calculating estimation by complexity"
            />
          </StackItem>
          <StackItem>
            <p>Calculating estimation by complexity for {clusterName}...</p>
          </StackItem>
        </Stack>
      );
    }

    if (estimationByComplexityError) {
      return (
        <Alert variant="danger" isInline title="Calculation failed">
          {estimationByComplexityError.message}
        </Alert>
      );
    }

    if (!estimationByComplexity) {
      return <p>No estimation by complexity data available.</p>;
    }

    const entries = estimationByComplexity.complexityByOsDisk;
    const activeEntries = entries.filter(
      (e: OsDiskEstimationEntryLike) => e.vmCount > 0,
    );

    return (
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h3">Estimation by complexity</Title>
        </StackItem>
        <StackItem>
          <Table aria-label="Estimation by complexity table" variant="compact">
            <Thead>
              <Tr>
                <Th>Complexity</Th>
                <Th>VM count</Th>
                <Th>Disk size</Th>
                <Th>Time estimation</Th>
              </Tr>
            </Thead>
            <Tbody>
              {activeEntries.map((entry: OsDiskEstimationEntryLike) => {
                const networkResult: SchemaEstimationResultLike | undefined =
                  entry.estimation?.["network-based"];
                const storageResult: SchemaEstimationResultLike | undefined =
                  entry.estimation?.["storage-offload"];
                return (
                  <Tr key={entry.score}>
                    <Td>
                      <Badge style={getComplexityBadgeStyle(entry.score)}>
                        {getComplexityLabel(entry.score)}
                      </Badge>
                    </Td>
                    <Td>{formatNumber(entry.vmCount)}</Td>
                    <Td>{formatDiskSize(entry.totalDiskSizeTB)}</Td>
                    <Td>
                      <div className={timeEstimationCellStyle}>
                        <div>
                          <span className={timeEstimationLabelStyle}>
                            Network-based:{" "}
                          </span>
                          <span className={timeEstimationValueStyle}>
                            {networkResult
                              ? `${durationToHours(networkResult.maxTotalDuration)} h`
                              : "\u2014"}
                          </span>
                        </div>
                        <div>
                          <span className={timeEstimationLabelStyle}>
                            Storage-offload:{" "}
                          </span>
                          <span className={timeEstimationValueStyle}>
                            {storageResult
                              ? `${durationToHours(storageResult.maxTotalDuration)} h`
                              : "\u2014"}
                          </span>
                        </div>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </StackItem>
      </Stack>
    );
  };

  return (
    <Card>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Flex
              justifyContent={{ default: "justifyContentFlexEnd" }}
              alignItems={{ default: "alignItemsFlexStart" }}
              flexWrap={{ default: "wrap" }}
            >
              <FlexItem>
                <div className={legendContainerStyle}>
                  {[1, 2, 3, 4, 0].map((score) => (
                    <Badge key={score} style={getComplexityBadgeStyle(score)}>
                      {getComplexityLabel(score)}
                    </Badge>
                  ))}
                </div>
              </FlexItem>
            </Flex>
          </StackItem>

          <StackItem>
            <div className={toggleGroupStyle}>
              <ToggleGroup aria-label="Complexity view selector">
                <ToggleGroupItem
                  text="By Operation System"
                  buttonId="toggle-by-os"
                  isSelected={activeTabKey === 0}
                  onChange={() => setActiveTabKey(0)}
                />
                <ToggleGroupItem
                  text="By Disk size"
                  buttonId="toggle-by-disk"
                  isSelected={activeTabKey === 1}
                  onChange={() => setActiveTabKey(1)}
                />
                <ToggleGroupItem
                  text="By Disk size & Operating system"
                  buttonId="toggle-by-disk-os"
                  isSelected={activeTabKey === 2}
                  onChange={() => setActiveTabKey(2)}
                />
              </ToggleGroup>
            </div>
          </StackItem>

          <StackItem>
            {activeTabKey === 0 && (
              <ComplexityOsTab osNameData={osNameData} totalVMs={totalVMs} />
            )}
            {activeTabKey === 1 && renderByDiskTab()}
            {activeTabKey === 2 && renderByDiskAndOSTab()}
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};

ComplexityResult.displayName = "ComplexityResult";

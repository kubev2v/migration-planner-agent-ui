import {
  Bullseye,
  Button,
  Content,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { ColumnsIcon, CopyIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import useLocalStorage from "../../../hooks/useLocalStorage";
import type {
  ForecasterStatus,
  ForecastRun,
  ForecastStats,
  SelectedPair,
} from "./forecasterTypes";
import { EstimateComparisonRow } from "./storageOffload/EstimateComparisonRow";
import {
  ALL_TOGGLEABLE_COLUMN_KEYS,
  DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS,
  isToggleableColumnVisible,
  TOGGLEABLE_COLUMNS,
  type ToggleableColumnKey,
  toggleToggleableColumn,
  totalColumnCount,
  VISIBLE_COLUMNS_KEY,
  VISIBLE_COLUMNS_VERSION,
} from "./storageOffload/storageOffloadColumns";
import {
  copyTextToClipboard,
  formatAllPairsStatsText,
  formatPairStatsText,
} from "./storageOffload/storageOffloadFormatters";
import {
  filterPairsByDatastoreName,
  findLivePairStatus,
  groupRunsBySession,
  indexRunsByPairName,
  mergeDisplayPairs,
} from "./storageOffload/storageOffloadUtils";

export interface StorageOffloadResultsViewProps {
  pairs: SelectedPair[];
  statsMap: Record<string, ForecastStats>;
  runs: ForecastRun[];
  isLoading: boolean;
  forecastStatus?: ForecasterStatus | null;
  benchmarkDone?: boolean;
  onAddPair: () => void;
  onStartOver: () => void;
  isBenchmarkRunning: boolean;
}

export const StorageOffloadResultsView: React.FC<
  StorageOffloadResultsViewProps
> = ({
  pairs,
  statsMap,
  runs,
  isLoading,
  forecastStatus,
  benchmarkDone = true,
  onAddPair,
  onStartOver,
  isBenchmarkRunning,
}) => {
  const [filter, setFilter] = useState("");
  const [drawerPair, setDrawerPair] = useState<SelectedPair | null>(null);
  const [isColumnSelectOpen, setIsColumnSelectOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<
    ToggleableColumnKey[]
  >(
    VISIBLE_COLUMNS_KEY,
    DEFAULT_VISIBLE_TOGGLEABLE_COLUMNS,
    VISIBLE_COLUMNS_VERSION,
  );

  const isColumnVisible = useCallback(
    (key: ToggleableColumnKey) =>
      isToggleableColumnVisible(key, visibleColumns),
    [visibleColumns],
  );

  const toggleColumn = useCallback(
    (key: ToggleableColumnKey) => {
      setVisibleColumns((prev) => toggleToggleableColumn(key, prev));
    },
    [setVisibleColumns],
  );

  const columnCount = totalColumnCount(visibleColumns);
  const livePairs = forecastStatus?.pairs ?? [];
  const runsByPairName = useMemo(() => indexRunsByPairName(runs), [runs]);

  const allPairs = useMemo(
    () => mergeDisplayPairs(pairs, forecastStatus),
    [pairs, forecastStatus],
  );

  const filteredPairs = useMemo(
    () => filterPairsByDatastoreName(allPairs, filter),
    [allPairs, filter],
  );

  const drawerRuns = drawerPair ? runsByPairName(drawerPair.name) : [];

  const copyAllAsText = () => {
    copyTextToClipboard(
      formatAllPairsStatsText(pairs, statsMap, runsByPairName),
    );
  };

  const panelContent = drawerPair ? (
    <DrawerPanelContent>
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          Individual runs
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={() => setDrawerPair(null)} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <Content component="p" style={{ marginBottom: "4px" }}>
          <strong>Source datastore:</strong> {drawerPair.sourceDatastore}
        </Content>
        <Content component="p" style={{ marginBottom: "16px" }}>
          <strong>Target datastore:</strong> {drawerPair.targetDatastore}
        </Content>
        {drawerRuns.length === 0 ? (
          <Content component="p">No runs recorded for this pair.</Content>
        ) : (
          <Table variant="compact" aria-label="Individual runs">
            <Thead>
              <Tr>
                <Th>Iteration</Th>
                <Th>Run time</Th>
                <Th>Duration (s)</Th>
                <Th>Throughput (MB/s)</Th>
                <Th>Method</Th>
              </Tr>
            </Thead>
            <Tbody>
              {groupRunsBySession(drawerRuns).map((row) =>
                row.kind === "session" ? (
                  <Tr key={`session-${row.sessionId}`}>
                    <Td
                      colSpan={5}
                      style={{
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        color: "var(--pf-t--global--text--color--200)",
                        background:
                          "var(--pf-t--global--background--color--100)",
                        borderTop:
                          row.sessionIndex > 1
                            ? "2px solid var(--pf-t--global--border--color--100)"
                            : undefined,
                      }}
                    >
                      Session {row.sessionIndex}
                    </Td>
                  </Tr>
                ) : (
                  <Tr key={row.run.id}>
                    <Td>{row.run.iteration}</Td>
                    <Td>{new Date(row.run.createdAt).toLocaleString()}</Td>
                    <Td>{row.run.durationSec.toFixed(1)}</Td>
                    <Td>{row.run.throughputMbps.toFixed(1)}</Td>
                    <Td>{row.run.method ?? "-"}</Td>
                  </Tr>
                ),
              )}
            </Tbody>
          </Table>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null;

  if (isLoading) {
    return (
      <EmptyState>
        <Spinner size="xl" />
        <EmptyStateBody>Loading results…</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Drawer isExpanded={drawerPair !== null} isInline position="end">
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>
          <Stack hasGutter>
            <StackItem>
              <Content component="h3" style={{ margin: 0, fontWeight: 600 }}>
                Estimate comparison
              </Content>
              <Content
                component="p"
                style={{
                  margin: "4px 0 0",
                  color: "var(--pf-t--global--text--color--200)",
                }}
              >
                Throughput and 1 TB transfer estimates by datastore pair. Values
                update while benchmarks run.
              </Content>
            </StackItem>

            <StackItem>
              <Flex
                alignItems={{ default: "alignItemsCenter" }}
                gap={{ default: "gapMd" }}
                wrap="wrap"
              >
                <FlexItem>
                  <SearchInput
                    placeholder="Filter by datastore name"
                    value={filter}
                    onChange={(_event, value) => setFilter(value)}
                    onClear={() => setFilter("")}
                    style={{ width: "280px" }}
                  />
                </FlexItem>
                <FlexItem>
                  <Select
                    role="menu"
                    isOpen={isColumnSelectOpen}
                    onSelect={(_event, selection) => {
                      toggleColumn(selection as ToggleableColumnKey);
                    }}
                    onOpenChange={setIsColumnSelectOpen}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsColumnSelectOpen((prev) => !prev)}
                        isExpanded={isColumnSelectOpen}
                      >
                        <ColumnsIcon /> Manage columns
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {ALL_TOGGLEABLE_COLUMN_KEYS.map((key) => (
                        <SelectOption
                          key={key}
                          value={key}
                          hasCheckbox
                          isSelected={isColumnVisible(key)}
                        >
                          {TOGGLEABLE_COLUMNS[key]}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FlexItem>
                <FlexItem
                  align={{ default: "alignRight" }}
                  grow={{ default: "grow" }}
                >
                  <Flex
                    justifyContent={{ default: "justifyContentFlexEnd" }}
                    gap={{ default: "gapSm" }}
                    wrap="wrap"
                  >
                    <FlexItem>
                      <Button
                        variant="primary"
                        onClick={onAddPair}
                        isDisabled={isBenchmarkRunning}
                        title={
                          isBenchmarkRunning
                            ? "Wait for the current benchmark to finish before adding more pairs"
                            : undefined
                        }
                      >
                        Add datastore pair estimate
                      </Button>
                    </FlexItem>
                    <FlexItem>
                      <Button
                        variant="link"
                        icon={<CopyIcon />}
                        iconPosition="start"
                        onClick={copyAllAsText}
                        isDisabled={
                          !pairs.some((p) => statsMap[p.name]?.sampleCount > 0)
                        }
                      >
                        Copy all as plain text
                      </Button>
                    </FlexItem>
                    <FlexItem>
                      <Button variant="link" onClick={onStartOver}>
                        Start over
                      </Button>
                    </FlexItem>
                  </Flex>
                </FlexItem>
              </Flex>
            </StackItem>

            <StackItem style={{ overflowX: "auto" }}>
              <Table variant="compact" aria-label="Estimate comparison">
                <Thead>
                  <Tr>
                    <Th>Source datastore</Th>
                    <Th>Target datastore</Th>
                    {ALL_TOGGLEABLE_COLUMN_KEYS.filter(isColumnVisible).map(
                      (key) => (
                        <Th key={key}>{TOGGLEABLE_COLUMNS[key]}</Th>
                      ),
                    )}
                    <Th>Runs</Th>
                    <Th>Last run</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredPairs.length === 0 ? (
                    <Tr>
                      <Td colSpan={columnCount}>
                        <Bullseye style={{ padding: "24px" }}>
                          <Content component="p">
                            {filter
                              ? "No datastore pairs match your filter."
                              : "No estimate runs yet."}
                          </Content>
                        </Bullseye>
                      </Td>
                    </Tr>
                  ) : (
                    filteredPairs.map((pair) => {
                      const stats = statsMap[pair.name];
                      const pairRuns = runsByPairName(pair.name);
                      const liveStatus = findLivePairStatus(pair, livePairs);

                      return (
                        <EstimateComparisonRow
                          key={pair.name}
                          pair={pair}
                          stats={stats}
                          pairRuns={pairRuns}
                          liveStatus={liveStatus}
                          benchmarkDone={benchmarkDone}
                          isColumnVisible={isColumnVisible}
                          onOpenRunsDrawer={setDrawerPair}
                          onCopy={() => {
                            if (stats) {
                              copyTextToClipboard(
                                formatPairStatsText(pair, stats, pairRuns),
                              );
                            }
                          }}
                        />
                      );
                    })
                  )}
                </Tbody>
              </Table>
            </StackItem>
          </Stack>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

StorageOffloadResultsView.displayName = "StorageOffloadResultsView";

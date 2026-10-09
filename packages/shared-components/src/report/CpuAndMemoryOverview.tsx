import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
} from "@patternfly/react-core";
import { DataProcessorIcon } from "@patternfly/react-icons";
import type { FC, Ref } from "react";
import { useMemo, useState } from "react";
import {
  MigrationDonutChart,
  type MigrationDonutChartDatum,
  type MigrationDonutChartLegendVariant,
} from "../charts/MigrationDonutChart.js";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { chartExportViewsFromLabels } from "./chartExport.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { dashboardStyles } from "./dashboardStyles.js";

export interface CpuAndMemoryOverviewProps {
  cpuTierDistribution?: Record<string, number>;
  memoryTierDistribution?: Record<string, number>;
  memoryTotalGB?: number;
  cpuTotalCores?: number;
  /**
   * Memory-tier slice click. The argument is the distribution key.
   * Agent-ui maps it to a VM memory filter; ui-app omits it.
   */
  onTierSelect?: (tierLabel: string) => void;
  /** Center-title click. Agent-ui opens the VM list with no extra filters. */
  onTitleClick?: () => void;
  /** `"html"` in agent-ui; ui-app passes `"chart"`. */
  legendVariant?: MigrationDonutChartLegendVariant;
}

type ViewMode = "memoryTiers" | "vcpuTiers";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  memoryTiers: "VM distribution by memory size tier",
  vcpuTiers: "VM distribution by vCPU count tier",
};

const VIEW_SUBTITLES: Record<ViewMode, string> = {
  memoryTiers: "Memory size tiers",
  vcpuTiers: "vCPU count tiers",
};

/**
 * Categorical order shared by the agent-ui and ui-app CPU/memory donuts.
 */
const TIER_COLORS = [
  "#0066cc",
  "#5e40be",
  "#b6a6e9",
  "#73c5c5",
  "#b98412",
  "#28a745",
  "#f0ad4e",
  "#d9534f",
  "#009596",
  "#6a6e73",
];

const CHART_ID = "cpu-memory-overview";
const CHART_TITLE = "CPU & memory";

const cardSubtitle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: 0.85rem;
`;

const menuToggleMinWidth = css`
  min-width: 290px;
`;

const titleRow = css`
  width: 100%;
`;

const isViewMode = (value: string | number | undefined): value is ViewMode =>
  value === "memoryTiers" || value === "vcpuTiers";

const tierSortKey = (label: string): number => {
  const value = Number.parseInt(label.trim(), 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

const hasUnit = (label: string, unit: "GB" | "cores"): boolean =>
  unit === "GB" ? /gb$/i.test(label) : /cores?$/i.test(label);

const slicesFromDistribution = (
  distribution: Record<string, number> | undefined,
  unit: "GB" | "cores",
): MigrationDonutChartDatum[] =>
  Object.entries(distribution ?? {})
    .filter(([, count]) => Number(count) > 0)
    .sort(([left], [right]) => tierSortKey(left) - tierSortKey(right))
    .map(([tier, count]) => {
      const trimmed = tier.trim();
      const name = hasUnit(trimmed, unit) ? trimmed : `${trimmed} ${unit}`;
      const vmCount = Number(count);
      return {
        name,
        count: vmCount,
        countDisplay: `${vmCount} VMs`,
        legendCategory: tier,
      };
    });

const legendFor = (categories: string[]): Record<string, string> => {
  const legend: Record<string, string> = {};
  categories.forEach((category, index) => {
    const color = TIER_COLORS[index % TIER_COLORS.length];
    if (color) {
      legend[category] = color;
    }
  });
  return legend;
};

export const CpuAndMemoryOverview: FC<CpuAndMemoryOverviewProps> = ({
  cpuTierDistribution,
  memoryTierDistribution,
  memoryTotalGB,
  cpuTotalCores,
  onTierSelect,
  onTitleClick,
  legendVariant = "html",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("memoryTiers");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const memorySlices = useMemo(
    () => slicesFromDistribution(memoryTierDistribution, "GB"),
    [memoryTierDistribution],
  );
  const vcpuSlices = useMemo(
    () => slicesFromDistribution(cpuTierDistribution, "cores"),
    [cpuTierDistribution],
  );

  const activeSlices = viewMode === "memoryTiers" ? memorySlices : vcpuSlices;
  const legend = useMemo(
    () => legendFor(activeSlices.map((slice) => slice.legendCategory)),
    [activeSlices],
  );
  const totalVMs = useMemo(
    () => activeSlices.reduce((sum, slice) => sum + slice.count, 0),
    [activeSlices],
  );

  const chartTitle = `${CHART_TITLE} — ${VIEW_MODE_LABELS[viewMode]}`;
  const subTitle =
    viewMode === "memoryTiers"
      ? typeof memoryTotalGB === "number"
        ? `${memoryTotalGB.toLocaleString()} GB`
        : undefined
      : typeof cpuTotalCores === "number"
        ? `${cpuTotalCores.toLocaleString()} Cores`
        : undefined;
  const emptyTitle =
    viewMode === "memoryTiers"
      ? REPORT_CARD_EMPTY_STATE_TITLES.memory
      : REPORT_CARD_EMPTY_STATE_TITLES.cpu;

  return (
    <ChartExportSurface
      id={CHART_ID}
      title={chartTitle}
      exportViews={chartExportViewsFromLabels(CHART_TITLE, VIEW_MODE_LABELS)}
      activeExportViewId={viewMode}
      onExportViewChange={(viewId) => {
        if (isViewMode(viewId)) {
          setViewMode(viewId);
        }
      }}
    >
      <Card className={dashboardStyles.card}>
        <CardTitle>
          <Flex
            className={titleRow}
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <div>
                <div>
                  <DataProcessorIcon /> {CHART_TITLE}
                </div>
                <div className={cardSubtitle}>{VIEW_SUBTITLES[viewMode]}</div>
              </div>
            </FlexItem>
            <ChartHeaderActions chartId={CHART_ID} title={chartTitle}>
              <Dropdown
                isOpen={isDropdownOpen}
                onSelect={(_event, value) => {
                  if (isViewMode(value)) {
                    setViewMode(value);
                  }
                  setIsDropdownOpen(false);
                }}
                onOpenChange={setIsDropdownOpen}
                toggle={(toggleRef: Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsDropdownOpen((open) => !open)}
                    isExpanded={isDropdownOpen}
                    className={menuToggleMinWidth}
                  >
                    {VIEW_MODE_LABELS[viewMode]}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem value="memoryTiers" key="memoryTiers">
                    {VIEW_MODE_LABELS.memoryTiers}
                  </DropdownItem>
                  <DropdownItem value="vcpuTiers" key="vcpuTiers">
                    {VIEW_MODE_LABELS.vcpuTiers}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ChartHeaderActions>
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {activeSlices.length === 0 ? (
            <CardEmptyState title={emptyTitle} />
          ) : (
            <MigrationDonutChart
              legendVariant={legendVariant}
              data={activeSlices}
              legend={legend}
              height={300}
              width={420}
              donutThickness={18}
              titleFontSize={34}
              title={`${totalVMs} VMs`}
              subTitle={subTitle}
              subTitleColor="var(--pf-t--global--text--color--subtle)"
              legendLabelFormatter={({ x, countDisplay }) =>
                `${x} (${countDisplay})`
              }
              tooltipLabelFormatter={({ datum, percent }) =>
                `${datum.countDisplay}\n${percent.toFixed(1)}%`
              }
              itemsPerRow={
                legendVariant === "chart"
                  ? Math.ceil(activeSlices.length / 2)
                  : undefined
              }
              labelFontSize={legendVariant === "chart" ? 18 : undefined}
              marginLeft={legendVariant === "chart" ? "52%" : undefined}
              onItemClick={
                viewMode === "memoryTiers" && onTierSelect
                  ? (item) => onTierSelect(item.legendCategory)
                  : undefined
              }
              onTitleClick={onTitleClick}
            />
          )}
        </CardBody>
      </Card>
    </ChartExportSurface>
  );
};

CpuAndMemoryOverview.displayName = "CpuAndMemoryOverview";

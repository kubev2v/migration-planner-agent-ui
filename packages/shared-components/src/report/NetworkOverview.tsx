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
import { TopologyIcon } from "@patternfly/react-icons";
import {
  chart_color_black_500,
  chart_color_blue_300,
  chart_color_green_300,
  chart_color_orange_100,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_red_orange_200,
  chart_color_teal_200,
  chart_color_teal_400,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
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

/** Network fields this card reads. Apps pass SDK networks structurally. */
export interface NetworkLike {
  vmsCount?: number;
  vlanId?: string | number;
}

/** Infra fields this card reads. */
export interface NetworkInfraLike {
  networks?: NetworkLike[];
}

/** Deprecated NIC histogram used when `distributionByNicCount` is absent. */
export interface NicCountHistogram {
  data?: number[];
  minValue?: number;
  step?: number;
}

/** NIC summary fields this card reads from the VM resource breakdown. */
export interface NicCountSummary {
  total?: number;
  histogram?: NicCountHistogram;
}

export interface NetworkOverviewProps {
  infra?: NetworkInfraLike;
  nicCount?: NicCountSummary;
  distributionByNicCount?: Record<string, number>;
  /**
   * Distinct VM count for the network-distribution donut center.
   * When omitted, falls back to the sum of per-network connection counts
   * (which may over-count multi-homed VMs).
   */
  uniqueVmCount?: number;
  /** `"html"` in agent-ui; ui-app passes `"chart"`. */
  legendVariant?: MigrationDonutChartLegendVariant;
}

type ViewMode = "networkDistribution" | "nicCount";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  networkDistribution: "VMs by network (may overlap)",
  nicCount: "VM distribution by NIC count",
};

const NETWORK_CARD_SUBTITLE =
  "Top 5 networks - a VM can be on multiple networks";

const TOP_NETWORKS = 4;
const REST_OF_NETWORKS_LABEL = "Rest of networks";
const CHART_ID = "network-overview";
const CHART_TITLE = "Networks";

/**
 * Categorical order from the ui-app network donut, mapped onto PatternFly
 * `chart_color_*` tokens (nearest token where the old hex was not a token).
 */
const NETWORK_COLORS = [
  chart_color_blue_300.value,
  chart_color_purple_300.value,
  chart_color_purple_100.value,
  chart_color_teal_200.value,
  chart_color_yellow_400.value,
  chart_color_green_300.value,
  chart_color_orange_100.value,
  chart_color_red_orange_200.value,
  chart_color_teal_400.value,
  chart_color_black_500.value,
];

const cardSubtitle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: 0.85rem;
`;

const menuToggleMinWidth = css`
  min-width: 250px;
`;

const titleRow = css`
  width: 100%;
`;

const isViewMode = (value: string | number | undefined): value is ViewMode =>
  value === "networkDistribution" || value === "nicCount";

const legendFor = (categories: string[]): Record<string, string> => {
  const legend: Record<string, string> = {};
  categories.forEach((category, index) => {
    const color = NETWORK_COLORS[index % NETWORK_COLORS.length];
    if (color) {
      legend[category] = color;
    }
  });
  return legend;
};

const vlanLabel = (vlanId: NetworkLike["vlanId"]): string => {
  if (typeof vlanId !== "string" && typeof vlanId !== "number") {
    return "-";
  }
  const value = String(vlanId).trim();
  return value !== "" ? value : "-";
};

const buildNetworkDonut = (
  networks: NetworkLike[] | undefined,
): {
  slices: MigrationDonutChartDatum[];
  legend: Record<string, string>;
  title: string;
  vlanBySlice: Record<string, string>;
} => {
  const items = (Array.isArray(networks) ? networks : [])
    .map((network) => ({
      vmsCount:
        typeof network?.vmsCount === "number" ? network.vmsCount : Number.NaN,
      vlanId: vlanLabel(network?.vlanId),
    }))
    .filter(
      (network) => Number.isFinite(network.vmsCount) && network.vmsCount >= 0,
    )
    .sort((a, b) => b.vmsCount - a.vmsCount);

  const totalVMs = items.reduce((sum, network) => sum + network.vmsCount, 0);
  const top = items.slice(0, TOP_NETWORKS);
  const restSum = items
    .slice(TOP_NETWORKS)
    .reduce((sum, network) => sum + network.vmsCount, 0);

  const vlanBySlice: Record<string, string> = {};
  const slices: MigrationDonutChartDatum[] = top.map((network, index) => {
    const name = `Network ${index + 1}`;
    vlanBySlice[name] = network.vlanId;
    return {
      name,
      count: network.vmsCount,
      countDisplay: `${network.vmsCount} VMs connected`,
      legendCategory: name,
    };
  });

  if (restSum > 0) {
    slices.push({
      name: REST_OF_NETWORKS_LABEL,
      count: restSum,
      countDisplay: `${restSum} VMs connected`,
      legendCategory: REST_OF_NETWORKS_LABEL,
    });
    vlanBySlice[REST_OF_NETWORKS_LABEL] = "-";
  }

  return {
    slices,
    legend: legendFor(slices.map((slice) => slice.legendCategory)),
    title: `${totalVMs}`,
    vlanBySlice,
  };
};

const nicBucketLabel = (bucket: string): string => {
  const count = Number.parseInt(bucket, 10);
  if (bucket.endsWith("+")) {
    return `${count}+ NIC`;
  }
  return count === 1 ? "1 NIC" : `${count} NIC`;
};

const compareNicBuckets = (
  a: { bucket: string },
  b: { bucket: string },
): number => {
  const aPlus = a.bucket.endsWith("+");
  const bPlus = b.bucket.endsWith("+");
  if (aPlus !== bPlus) {
    return aPlus ? 1 : -1;
  }
  const aNum = Number.parseInt(a.bucket, 10);
  const bNum = Number.parseInt(b.bucket, 10);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }
  return a.bucket.localeCompare(b.bucket);
};

const slicesFromBuckets = (
  entries: { bucket: string; count: number }[],
): MigrationDonutChartDatum[] =>
  entries.map((entry) => {
    const label = nicBucketLabel(entry.bucket);
    return {
      name: label,
      count: entry.count,
      countDisplay: `${entry.count} VMs`,
      legendCategory: label,
    };
  });

const buildNicDonut = (
  distributionByNicCount: Record<string, number> | undefined,
  nicCount: NicCountSummary | undefined,
): {
  slices: MigrationDonutChartDatum[];
  legend: Record<string, string>;
  title: string;
} => {
  if (distributionByNicCount != null) {
    const entries = Object.entries(distributionByNicCount)
      .map(([bucket, value]) => ({
        bucket,
        count: Number.isFinite(Number(value)) ? Number(value) : 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort(compareNicBuckets);
    const slices = slicesFromBuckets(entries);
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return {
      slices,
      legend: legendFor(slices.map((slice) => slice.legendCategory)),
      title: `${total}`,
    };
  }

  const histogram = nicCount?.histogram;
  const data = Array.isArray(histogram?.data) ? histogram.data : [];
  const minValue =
    typeof histogram?.minValue === "number" ? histogram.minValue : 0;
  const step = typeof histogram?.step === "number" ? histogram.step : 1;
  const buckets = data
    .map((count, index) => ({
      bucket: String(minValue + index * step),
      count: Number(count) || 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => Number(a.bucket) - Number(b.bucket));
  const slices = slicesFromBuckets(buckets);
  const total =
    typeof nicCount?.total === "number"
      ? nicCount.total
      : buckets.reduce((sum, entry) => sum + entry.count, 0);

  return {
    slices,
    legend: legendFor(slices.map((slice) => slice.legendCategory)),
    title: `${total}`,
  };
};

export const NetworkOverview: FC<NetworkOverviewProps> = ({
  infra,
  nicCount,
  distributionByNicCount,
  uniqueVmCount,
  legendVariant = "html",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("networkDistribution");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const networkChart = useMemo(
    () => buildNetworkDonut(infra?.networks),
    [infra?.networks],
  );
  const nicChart = useMemo(
    () => buildNicDonut(distributionByNicCount, nicCount),
    [distributionByNicCount, nicCount],
  );

  const chartTitle = `${CHART_TITLE} — ${VIEW_MODE_LABELS[viewMode]}`;
  const networkTitle =
    typeof uniqueVmCount === "number" && Number.isFinite(uniqueVmCount)
      ? `${uniqueVmCount}`
      : networkChart.title;
  const activeChart =
    viewMode === "networkDistribution"
      ? { ...networkChart, title: networkTitle }
      : nicChart;
  const activeSubTitle =
    viewMode === "networkDistribution" ? "unique VMs" : "VMs";
  const emptyTitle =
    viewMode === "networkDistribution"
      ? REPORT_CARD_EMPTY_STATE_TITLES.networks
      : REPORT_CARD_EMPTY_STATE_TITLES.nicCount;

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
                  <TopologyIcon /> {CHART_TITLE}
                </div>
                {viewMode === "networkDistribution" && (
                  <div className={cardSubtitle}>{NETWORK_CARD_SUBTITLE}</div>
                )}
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
                  <DropdownItem
                    value="networkDistribution"
                    key="networkDistribution"
                  >
                    {VIEW_MODE_LABELS.networkDistribution}
                  </DropdownItem>
                  <DropdownItem value="nicCount" key="nicCount">
                    {VIEW_MODE_LABELS.nicCount}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ChartHeaderActions>
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {activeChart.slices.length === 0 ? (
            <CardEmptyState title={emptyTitle} />
          ) : (
            <MigrationDonutChart
              legendVariant={legendVariant}
              data={activeChart.slices}
              legend={activeChart.legend}
              height={300}
              width={420}
              donutThickness={18}
              titleFontSize={34}
              title={activeChart.title}
              subTitle={activeSubTitle}
              subTitleColor="var(--pf-t--global--text--color--subtle)"
              itemsPerRow={Math.ceil(activeChart.slices.length / 2)}
              labelFontSize={18}
              marginLeft="0%"
              tooltipLabelFormatter={({ datum, percent }) => {
                const summary = `${datum.countDisplay}\n${percent.toFixed(1)}%`;
                if (viewMode !== "networkDistribution") {
                  return summary;
                }
                const vlan = networkChart.vlanBySlice[datum.legendCategory];
                return `${summary}\nVLAN: ${vlan ?? "-"}`;
              }}
            />
          )}
        </CardBody>
      </Card>
    </ChartExportSurface>
  );
};

NetworkOverview.displayName = "NetworkOverview";

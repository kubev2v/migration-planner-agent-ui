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
import { DatabaseIcon } from "@patternfly/react-icons";
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

/**
 * Cluster inventory fields this card reads.
 * agent-sdk and planner-sdk inventories both satisfy it. `cpuOverCommitment`
 * stays `unknown` because generated models type it as a number while older
 * payloads send a ratio string such as `"1:4"`.
 */
export interface InventoryDataLike {
  infra?: {
    cpuOverCommitment?: unknown;
  };
  vms?: {
    total?: number;
  };
}

export interface ClustersOverviewProps {
  clustersPerDatacenter?: number[];
  clusters?: Record<string, InventoryDataLike>;
  /** `"html"` in agent-ui; ui-app passes `"chart"`. */
  legendVariant?: MigrationDonutChartLegendVariant;
}

type ViewMode = "dataCenterDistribution" | "vmByCluster" | "cpuOverCommitment";

interface ClusterChart {
  chartData: MigrationDonutChartDatum[];
  legend: Record<string, string>;
  title: string;
  subTitle: string;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  dataCenterDistribution: "Cluster distribution by data center",
  vmByCluster: "VM distribution by cluster",
  cpuOverCommitment: "Cluster CPU over commitment",
};

const TOP_CLUSTERS = 4;
const TOP_CPU_RATIOS = 5;
const REST_OF_CLUSTERS_LABEL = "Rest of clusters";
const REST_OF_DATACENTERS_LABEL = "Rest of datacenters";
const CHART_ID = "clusters-overview";
const CHART_TITLE = "Clusters";

/**
 * Same categorical order as the previous cluster hex palette, mapped onto
 * PatternFly `chart_color_*` tokens (nearest token where the old hex was
 * not itself a token).
 */
const CLUSTER_COLORS = [
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

const EMPTY_CHART: ClusterChart = {
  chartData: [],
  legend: {},
  title: "",
  subTitle: "",
};

const isViewMode = (value: string | number | undefined): value is ViewMode =>
  value === "dataCenterDistribution" ||
  value === "vmByCluster" ||
  value === "cpuOverCommitment";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const legendFor = (categories: string[]): Record<string, string> => {
  const legend: Record<string, string> = {};
  categories.forEach((category, index) => {
    const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
    if (color) {
      legend[category] = color;
    }
  });
  return legend;
};

const readCounts = (values: unknown): number[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 0,
  );
};

const readClusters = (clusters: unknown): unknown[] => {
  if (!isRecord(clusters)) {
    return [];
  }
  return Object.values(clusters);
};

const readVmTotal = (cluster: unknown): number => {
  if (!isRecord(cluster) || !isRecord(cluster.vms)) {
    return 0;
  }
  const total = cluster.vms.total;
  return typeof total === "number" && Number.isFinite(total) && total >= 0
    ? total
    : 0;
};

/**
 * Read `infra.cpuOverCommitment` without assuming either SDK's generated
 * shape. Missing infra, a non-object infra, or an absent property yield
 * `undefined` instead of throwing.
 */
const readCpuOverCommitment = (cluster: unknown): unknown => {
  if (!isRecord(cluster) || !isRecord(cluster.infra)) {
    return undefined;
  }
  if (!("cpuOverCommitment" in cluster.infra)) {
    return undefined;
  }
  return cluster.infra.cpuOverCommitment;
};

const parseCpuOverCommitment = (raw: unknown): number => {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : Number.NaN;
  }
  if (typeof raw !== "string") {
    return Number.NaN;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return Number.NaN;
  }
  const match = trimmed.match(/^\d+\s*:\s*(\d+(?:\.\d+)?)$/);
  if (match?.[1] != null) {
    return Number(match[1]);
  }
  const asNum = Number(trimmed);
  return Number.isFinite(asNum) ? asNum : Number.NaN;
};

const formatRatio = (ratio: number): string => {
  const formatted = ratio % 1 === 0 ? ratio.toFixed(0) : ratio.toFixed(2);
  return formatted.replace(/(?:\.0+|(\.\d*[1-9]))0+$/, "$1");
};

const buildRankedDonut = (
  counts: number[],
  options: {
    sliceName: (rank: number) => string;
    countSuffix: string;
    restName: string;
    subTitle: string;
  },
): ClusterChart => {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const ranked = counts
    .map((count, index) => ({ count, index }))
    .sort((a, b) => b.count - a.count);
  const top = ranked.slice(0, TOP_CLUSTERS);
  const restSum = ranked
    .slice(TOP_CLUSTERS)
    .reduce((sum, item) => sum + item.count, 0);

  const slices: MigrationDonutChartDatum[] = top.map((item, index) => {
    const name = options.sliceName(index + 1);
    return {
      name,
      count: item.count,
      countDisplay: `${item.count} ${options.countSuffix}`,
      legendCategory: name,
    };
  });

  if (restSum > 0) {
    slices.push({
      name: options.restName,
      count: restSum,
      countDisplay: `${restSum} ${options.countSuffix}`,
      legendCategory: options.restName,
    });
  }

  return {
    chartData: slices,
    legend: legendFor(slices.map((slice) => slice.legendCategory)),
    title: `${total}`,
    subTitle: options.subTitle,
  };
};

const buildVmByCluster = (clusters: unknown): ClusterChart => {
  const counts = readClusters(clusters).map(readVmTotal);
  if (counts.length === 0) {
    return EMPTY_CHART;
  }
  return buildRankedDonut(counts, {
    sliceName: (rank) => `Cluster ${rank}`,
    countSuffix: "VMs",
    restName: REST_OF_CLUSTERS_LABEL,
    subTitle: "VMs",
  });
};

const buildDatacenterDistribution = (
  clustersPerDatacenter: unknown,
): ClusterChart => {
  const counts = readCounts(clustersPerDatacenter);
  if (counts.length === 0) {
    return EMPTY_CHART;
  }
  return buildRankedDonut(counts, {
    sliceName: (rank) => `Data center ${rank}`,
    countSuffix: "clusters",
    restName: REST_OF_DATACENTERS_LABEL,
    subTitle: "Clusters",
  });
};

const buildCpuOverCommitment = (clusters: unknown): ClusterChart => {
  const ranked = readClusters(clusters)
    .map((cluster) => parseCpuOverCommitment(readCpuOverCommitment(cluster)))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => b - a)
    .slice(0, TOP_CPU_RATIOS);

  const slices: MigrationDonutChartDatum[] = ranked.map((value, index) => {
    const legendCategory = `Cluster ${index + 1}`;
    const display = formatRatio(value);
    return {
      name: display,
      count: value,
      countDisplay: display,
      legendCategory,
    };
  });

  return {
    chartData: slices,
    legend: legendFor(slices.map((slice) => slice.legendCategory)),
    title: "",
    subTitle: "",
  };
};

export const ClustersOverview: FC<ClustersOverviewProps> = ({
  clustersPerDatacenter,
  clusters,
  legendVariant = "html",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("vmByCluster");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const chart = useMemo(() => {
    if (viewMode === "cpuOverCommitment") {
      return buildCpuOverCommitment(clusters);
    }
    if (viewMode === "vmByCluster") {
      return buildVmByCluster(clusters);
    }
    return buildDatacenterDistribution(clustersPerDatacenter);
  }, [viewMode, clustersPerDatacenter, clusters]);

  const chartTitle = `${CHART_TITLE} — ${VIEW_MODE_LABELS[viewMode]}`;
  const emptyTitle =
    viewMode === "cpuOverCommitment"
      ? REPORT_CARD_EMPTY_STATE_TITLES.cpuOvercommitment
      : REPORT_CARD_EMPTY_STATE_TITLES.clusters;

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
            className={dashboardStyles.clustersTitleRow}
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <div>
                <div>
                  <DatabaseIcon /> {CHART_TITLE}
                </div>
                <div className={dashboardStyles.clustersCardSubtitle}>
                  {viewMode === "dataCenterDistribution"
                    ? "Top 5 datacenters"
                    : "Top 5 clusters"}
                </div>
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
                    className={dashboardStyles.clustersMenuToggleMinWidth}
                  >
                    {VIEW_MODE_LABELS[viewMode]}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem value="vmByCluster" key="vmByCluster">
                    {VIEW_MODE_LABELS.vmByCluster}
                  </DropdownItem>
                  <DropdownItem
                    value="cpuOverCommitment"
                    key="cpuOverCommitment"
                  >
                    {VIEW_MODE_LABELS.cpuOverCommitment}
                  </DropdownItem>
                  <DropdownItem
                    value="dataCenterDistribution"
                    key="dataCenterDistribution"
                  >
                    {VIEW_MODE_LABELS.dataCenterDistribution}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ChartHeaderActions>
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {chart.chartData.length === 0 ? (
            <CardEmptyState title={emptyTitle} />
          ) : viewMode === "cpuOverCommitment" ? (
            <>
              <div className={dashboardStyles.cpuOvercommitBoxes}>
                {chart.chartData.map((item) => (
                  <div
                    key={`cpu-box-${item.legendCategory}`}
                    className={dashboardStyles.cpuOvercommitBox}
                    style={{ background: chart.legend[item.legendCategory] }}
                  >
                    {item.countDisplay}
                  </div>
                ))}
              </div>
              <div className={dashboardStyles.cpuOvercommitLegend}>
                {chart.chartData.map((item) => (
                  <div
                    key={`cpu-legend-${item.legendCategory}`}
                    className={dashboardStyles.cpuOvercommitLegendItem}
                  >
                    <span
                      className={dashboardStyles.cpuOvercommitLegendSwatch}
                      style={{ background: chart.legend[item.legendCategory] }}
                    />
                    <span className={dashboardStyles.cpuOvercommitLegendText}>
                      {item.legendCategory} ({item.countDisplay})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <MigrationDonutChart
              legendVariant={legendVariant}
              data={chart.chartData}
              height={300}
              width={420}
              donutThickness={18}
              titleFontSize={34}
              legend={chart.legend}
              title={chart.title}
              subTitle={chart.subTitle}
              subTitleColor="var(--pf-t--global--text--color--subtle)"
              tooltipLabelFormatter={({ datum, percent }) =>
                `${datum.countDisplay}\n${percent.toFixed(1)}%`
              }
            />
          )}
        </CardBody>
      </Card>
    </ChartExportSurface>
  );
};

ClustersOverview.displayName = "ClustersOverview";

import { css } from "@emotion/css";
import type { InventoryData } from "@migration-planner-ui/agent-client/models";
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
import type React from "react";
import { useMemo, useState } from "react";

import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";

interface ClustersOverviewProps {
  clustersPerDatacenter: number[];
  isExportMode?: boolean;
  clusters?: { [key: string]: InventoryData };
}

type ViewMode = "dataCenterDistribution" | "vmByCluster" | "cpuOverCommitment";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  dataCenterDistribution: "Cluster distribution by data center",
  vmByCluster: "VM distribution by cluster",
  cpuOverCommitment: "Cluster CPU over commitment",
};

// Emotion styles
const styles = {
  cpuOvercommitBoxes: css`
    display: flex;
    justify-content: center;
    gap: 12px;
    margin: 124px 0 16px;
    flex-wrap: wrap;

    @media (max-width: 1200px) {
      margin: 72px 0 12px;
      gap: 20px;
    }

    @media (max-width: 768px) {
      margin: 40px 0 8px;
      gap: 16px;
    }
  `,

  cpuOvercommitBox: css`
    color: #000;
    min-width: 120px;
    height: 64px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    padding: 0 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

    @media (max-width: 768px) {
      min-width: 96px;
      height: 56px;
      font-size: 18px;
      padding: 0 12px;
      border-radius: 10px;
    }

    @media (max-width: 480px) {
      min-width: 88px;
      height: 48px;
      font-size: 16px;
      border-radius: 8px;
    }
  `,

  cpuOvercommitLegend: css`
    display: flex;
    justify-content: center;
    gap: 6px 24px;
    flex-wrap: wrap;
    margin-top: 20%;

    @media (max-width: 1200px) {
      margin-top: 20%;
      gap: 6px 20px;
    }

    @media (max-width: 768px) {
      margin-top: 20%;
      gap: 6px 16px;
    }
  `,

  cpuOvercommitLegendItem: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,

  cpuOvercommitLegendSwatch: css`
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;

    @media (max-width: 768px) {
      width: 10px;
      height: 10px;
    }
  `,

  cpuOvercommitLegendText: css`
    font-size: 16px;

    @media (max-width: 768px) {
      font-size: 16px;
    }

    @media (max-width: 480px) {
      font-size: 14px;
    }
  `,
};

// Extended palette to avoid repeating colors when we have >4 slices
const colorPalette = [
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

export const ClustersOverview: React.FC<ClustersOverviewProps> = ({
  clustersPerDatacenter,
  isExportMode = false,
  clusters,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("vmByCluster");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { chartData, legend, title, subTitle } = useMemo(() => {
    const buildLegend = (categories: string[]): Record<string, string> => {
      const legendMap: Record<string, string> = {};
      categories.forEach((cat, idx) => {
        legendMap[cat] = colorPalette[idx % colorPalette.length];
      });
      return legendMap;
    };

    if (viewMode === "cpuOverCommitment") {
      const entries = clusters ? Object.entries(clusters) : [];

      const parseCpuOverCommitment = (raw: unknown): number => {
        if (raw == null) return NaN;
        if (typeof raw === "number") return raw;
        if (typeof raw === "string") {
          const match = raw.match(/^\s*\d+\s*:\s*(\d+(?:\.\d+)?)\s*$/);
          if (match) return Number(match[1]);
          const asNum = Number(raw);
          return Number.isFinite(asNum) ? asNum : NaN;
        }
        return NaN;
      };

      const withValue = entries
        .map(([clusterName, data]) => {
          const raw = data?.infra?.cpuOverCommitment;
          const value = parseCpuOverCommitment(raw);
          return { clusterName, value };
        })
        .filter((item) => Number.isFinite(item.value) && item.value >= 0)
        .sort((a, b) => b.value - a.value);

      const TOP_N = 5;
      const top = withValue.slice(0, TOP_N);

      const formatRatio = (r: number): string => {
        const formatted = r % 1 === 0 ? r.toFixed(0) : r.toFixed(2);
        return `${formatted.replace(/(?:\.0+|(\.\d*[1-9]))0+$/, "$1")}`;
      };

      const slices = top.map((item, idx) => ({
        name: formatRatio(item.value),
        count: item.value,
        countDisplay: formatRatio(item.value),
        legendCategory: `Cluster ${idx + 1}`,
      }));
      const legendCategories = slices.map((s) => s.legendCategory);
      return {
        chartData: slices,
        legend: buildLegend(legendCategories),
        title: "",
        subTitle: "",
      };
    }

    if (viewMode === "vmByCluster") {
      // Sort clusters by VM count and get real cluster names
      const clusterEntries = clusters
        ? Object.entries(clusters).map(([name, data]) => ({
            name,
            count: data.vms?.total ?? 0,
          }))
        : [];

      const totalVMs = clusterEntries.reduce((acc, c) => acc + c.count, 0);
      const TOP_N = 4;

      const ranked = clusterEntries.sort((a, b) => b.count - a.count);
      const top = ranked.slice(0, TOP_N);
      const rest = ranked.slice(TOP_N);
      const restSum = rest.reduce((acc, r) => acc + r.count, 0);

      // Map display names to actual cluster names
      const indexToName = new Map<string, string>();

      const slices = top.map((item, i) => {
        const displayName = `Cluster ${i + 1}`;
        indexToName.set(displayName, item.name);
        return {
          name: displayName,
          count: item.count,
          countDisplay: `${item.count} VMs`,
          legendCategory: displayName,
        };
      });

      if (restSum > 0) {
        slices.push({
          name: "Rest of clusters",
          count: restSum,
          countDisplay: `${restSum} VMs`,
          legendCategory: "Rest of clusters",
        });
      }

      const legendCategories = slices.map((s) => s.legendCategory);
      return {
        chartData: slices,
        legend: buildLegend(legendCategories),
        title: `${totalVMs}`,
        subTitle: "VMs",
      };
    }

    const counts = Array.isArray(clustersPerDatacenter)
      ? [...clustersPerDatacenter]
      : [];
    const totalClusters = counts.reduce((acc, n) => acc + n, 0);

    const TOP_N = 4;
    const ranked = counts
      .map((count, index) => ({ count, index }))
      .sort((a, b) => b.count - a.count);
    const top = ranked.slice(0, TOP_N);
    const rest = ranked.slice(TOP_N);
    const restSum = rest.reduce((acc, r) => acc + r.count, 0);

    const slices = top.map((item, i) => {
      const name = `Data center ${i + 1}`;
      return {
        name,
        count: item.count,
        countDisplay: `${item.count} clusters`,
        legendCategory: name,
      };
    });
    if (restSum > 0) {
      slices.push({
        name: "Rest of datacenters",
        count: restSum,
        countDisplay: `${restSum} clusters`,
        legendCategory: "Rest of datacenters",
      });
    }

    const legendCategories = slices.map((s) => s.legendCategory);
    return {
      chartData: slices,
      legend: buildLegend(legendCategories),
      title: `${totalClusters}`,
      subTitle: "Clusters",
    };
  }, [viewMode, clustersPerDatacenter, clusters]);

  const onDropdownToggle = (): void => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ): void => {
    if (
      value === "dataCenterDistribution" ||
      value === "vmByCluster" ||
      value === "cpuOverCommitment"
    ) {
      setViewMode(value);
    }
    setIsDropdownOpen(false);
  };

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="clusters-overview"
      data-export-block={isExportMode ? "3.1" : undefined}
      style={{ overflow: "hidden" }}
    >
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
          style={{ width: "100%" }}
        >
          <FlexItem>
            <div>
              <div>
                <DatabaseIcon /> Clusters
              </div>
              {!isExportMode && (
                <div style={{ color: "#6a6e73", fontSize: "0.85rem" }}>
                  {viewMode === "dataCenterDistribution"
                    ? "Top 5 datacenters"
                    : "Top 5 clusters"}
                </div>
              )}
            </div>
          </FlexItem>
          {!isExportMode && (
            <FlexItem>
              <Dropdown
                isOpen={isDropdownOpen}
                onSelect={onSelect}
                onOpenChange={(isOpen: boolean) => setIsDropdownOpen(isOpen)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={onDropdownToggle}
                    isExpanded={isDropdownOpen}
                    style={{ minWidth: "250px" }}
                  >
                    {VIEW_MODE_LABELS[viewMode]}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem key="vmByCluster" value="vmByCluster">
                    VM distribution by cluster
                  </DropdownItem>
                  <DropdownItem
                    key="cpuOverCommitment"
                    value="cpuOverCommitment"
                  >
                    Cluster CPU over commitment
                  </DropdownItem>
                  <DropdownItem
                    key="dataCenterDistribution"
                    value="dataCenterDistribution"
                  >
                    Cluster distribution by data center
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        {viewMode === "cpuOverCommitment" ? (
          chartData.length === 0 ? (
            <div style={{ color: "#6a6e73", textAlign: "center" }}>
              This inventory has no cpuOverCommitment information.
            </div>
          ) : (
            <>
              <div className={styles.cpuOvercommitBoxes}>
                {chartData.map((item) => (
                  <div
                    key={`cpu-box-${item.legendCategory}`}
                    className={styles.cpuOvercommitBox}
                    style={{ background: legend[item.legendCategory] }}
                  >
                    {item.countDisplay}
                  </div>
                ))}
              </div>
              <div className={styles.cpuOvercommitLegend}>
                {chartData.map((item) => (
                  <div
                    key={`cpu-legend-${item.legendCategory}`}
                    className={styles.cpuOvercommitLegendItem}
                  >
                    <span
                      className={styles.cpuOvercommitLegendSwatch}
                      style={{ background: legend[item.legendCategory] }}
                    />
                    <span className={styles.cpuOvercommitLegendText}>
                      {item.legendCategory} ({item.countDisplay})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          <MigrationDonutChart
            data={chartData}
            height={300}
            width={420}
            donutThickness={9}
            titleFontSize={34}
            legend={legend}
            title={title}
            subTitle={subTitle}
            subTitleColor="#9a9da0"
            itemsPerRow={Math.ceil(chartData.length / 2)}
            labelFontSize={viewMode === "vmByCluster" ? 18 : 17}
            marginLeft={viewMode === "vmByCluster" ? "12%" : "0%"}
            tooltipLabelFormatter={({ datum, percent }) =>
              `${datum.countDisplay}\n${percent.toFixed(1)}%`
            }
          />
        )}
      </CardBody>
    </Card>
  );
};

ClustersOverview.displayName = "ClustersOverview";

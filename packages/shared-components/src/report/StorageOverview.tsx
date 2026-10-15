import {
  Card,
  CardBody,
  CardTitle,
  Content,
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
  chart_color_blue_300,
  chart_color_green_300,
  chart_color_orange_200,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_red_orange_300,
  chart_color_teal_200,
  chart_color_teal_300,
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

export interface StorageDiskTierData {
  vmCount?: number;
  totalSizeTB?: number;
}

export interface StorageOverviewProps {
  diskSizeTier?: Record<string, StorageDiskTierData>;
  diskTypes?: Record<string, StorageDiskTierData>;
  totalVMs?: number;
  totalWithSharedDisks?: number;
  /**
   * Disk-tier slice / center-title click. The argument is the tier's parsed
   * disk-size range (in MB). Agent-ui maps it to a VM disk filter; ui-app omits
   * it. Called with `undefined` for the center-title click (no tier filter).
   */
  onDiskTierSelect?: (diskRange: { min: number; max?: number }) => void;
  /** Center-title click. Agent-ui opens the VM list with no extra filters. */
  onTitleClick?: () => void;
  /** `"html"` in agent-ui; ui-app passes `"chart"`. */
  legendVariant?: MigrationDonutChartLegendVariant;
}

type ViewMode = "totalSize" | "vmCount" | "vmCountByDiskType" | "sharedDisks";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  totalSize: "Total disk size by tier",
  vmCount: "VM count by disk size tier",
  vmCountByDiskType: "VM count by disk type",
  sharedDisks: "Shared disks VS. No shared disks",
};

const CHART_ID = "storage-overview";
const CHART_TITLE = "Storage";

const TIER_CONFIG: Record<
  string,
  { order: number; label: string; legendCategory: string }
> = {
  Easy: { order: 0, label: "0-10 TB", legendCategory: "Easy" },
  Medium: { order: 1, label: "11-20 TB", legendCategory: "Medium" },
  Hard: { order: 2, label: "21-50 TB", legendCategory: "Hard" },
  White: { order: 3, label: "> 50 TB", legendCategory: "White glove" },
};

/**
 * Categorical order shared by the agent-ui and ui-app storage donuts, mapped
 * onto PatternFly `chart_color_*` tokens.
 */
const COLOR_PALETTE = [
  chart_color_blue_300.value,
  chart_color_purple_300.value,
  chart_color_purple_100.value,
  chart_color_teal_300.value,
  chart_color_yellow_400.value,
  chart_color_green_300.value,
  chart_color_orange_200.value,
  chart_color_red_orange_300.value,
];

const DISK_TYPE_BAR_COLORS = [
  chart_color_blue_300.value,
  chart_color_purple_300.value,
  chart_color_purple_100.value,
  chart_color_yellow_400.value,
  chart_color_teal_200.value,
];

const SHARED_DISKS_COLORS: Record<string, string> = {
  "With shared disks": chart_color_yellow_400.value,
  "No shared disks": chart_color_blue_300.value,
};

const DISK_TYPE_PREFERRED_ORDER = ["VMFS", "NFS", "vSAN", "RDM", "vVols"];

// --- Disk-tier label parsing (self-contained copy so the shared card does not
// depend on agent-ui internals). Used for both tier ordering and drill-down. ---

const MB_IN_GIB = 1024;
const MB_IN_TIB = 1024 * 1024;

const diskSizeRanges = [
  { label: "0-100GiB", min: 0, max: 100 * MB_IN_GIB },
  { label: "100-500GiB", min: 100 * MB_IN_GIB, max: 500 * MB_IN_GIB },
  { label: "500GiB-1TiB", min: 500 * MB_IN_GIB, max: MB_IN_TIB },
  { label: "1-2TiB", min: MB_IN_TIB, max: 2 * MB_IN_TIB },
  { label: "2-5TiB", min: 2 * MB_IN_TIB, max: 5 * MB_IN_TIB },
];

const legacyDiskSizeRanges = [
  { label: "0-10 TB", min: 0, max: 10 * MB_IN_TIB },
  { label: "11-20 TB", min: 10 * MB_IN_TIB + 1, max: 20 * MB_IN_TIB },
  { label: "21-50 TB", min: 20 * MB_IN_TIB + 1, max: 50 * MB_IN_TIB },
  { label: "50+ TB", min: 50 * MB_IN_TIB + 1, max: undefined },
];

const sizeValueToMB = (value: string, unit: string): number => {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return Number.NaN;
  }
  switch (unit.toLowerCase()) {
    case "gib":
    case "gb":
      return amount * MB_IN_GIB;
    case "tib":
    case "tb":
      return amount * MB_IN_TIB;
    case "mib":
    case "mb":
      return amount;
    default:
      return Number.NaN;
  }
};

/** Parses inventory disk tier labels (GiB/TiB or legacy TB buckets) into MB ranges. */
const parseDiskTierLabelToRange = (
  label: string,
): { min: number; max?: number } | undefined => {
  const normalized = label.trim();
  if (!normalized) {
    return undefined;
  }

  const predefined =
    diskSizeRanges.find((range) => range.label === normalized) ??
    legacyDiskSizeRanges.find(
      (range) =>
        range.label === normalized ||
        (normalized === "> 50 TB" && range.label === "50+ TB"),
    );
  if (predefined) {
    return { min: predefined.min, max: predefined.max };
  }

  const mixedUnitRange =
    /^(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)\s*-\s*(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)$/i.exec(
      normalized,
    );
  if (mixedUnitRange) {
    const min = sizeValueToMB(mixedUnitRange[1], mixedUnitRange[2]);
    const max = sizeValueToMB(mixedUnitRange[3], mixedUnitRange[4]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.floor(min), max: Math.floor(max) };
    }
  }

  const singleUnitRange =
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)$/i.exec(
      normalized,
    );
  if (singleUnitRange) {
    const min = sizeValueToMB(singleUnitRange[1], singleUnitRange[3]);
    const max = sizeValueToMB(singleUnitRange[2], singleUnitRange[3]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.floor(min), max: Math.floor(max) };
    }
  }

  const openEndedRange =
    /^(\d+(?:\.\d+)?)\s*(GiB|TiB|GB|TB|MIB|MB)?\s*\+$/i.exec(normalized);
  if (openEndedRange) {
    const unit = openEndedRange[2] || "TB";
    const min = sizeValueToMB(openEndedRange[1], unit);
    if (Number.isFinite(min)) {
      const minMB = Math.floor(min);
      return { min: minMB > 0 ? minMB + 1 : minMB, max: undefined };
    }
  }

  return undefined;
};

const buildTierChartData = (
  summary: Record<string, StorageDiskTierData> | undefined,
  selector: (tier: StorageDiskTierData) => {
    count: number;
    countDisplay: string;
  },
): MigrationDonutChartDatum[] => {
  if (!summary) {
    return [];
  }

  const getTierPrefix = (key: string): string | null => {
    const normalizedKey = key.trim().toLowerCase();
    for (const prefix of Object.keys(TIER_CONFIG)) {
      if (normalizedKey.startsWith(prefix.toLowerCase())) {
        return prefix;
      }
    }
    return null;
  };

  return Object.entries(summary)
    .map(([key, tier]) => {
      const prefix = getTierPrefix(key);
      const display = prefix
        ? TIER_CONFIG[prefix]
        : { label: key, legendCategory: key };
      const { count, countDisplay } = selector(tier);
      const label = display.label;
      return {
        name: label,
        count,
        countDisplay,
        legendCategory: display.legendCategory,
        diskRange:
          parseDiskTierLabelToRange(key) ?? parseDiskTierLabelToRange(label),
        sortOrder:
          parseDiskTierLabelToRange(key)?.min ??
          parseDiskTierLabelToRange(label)?.min ??
          (prefix ? TIER_CONFIG[prefix].order : 999),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _sortOrder, ...datum }) => datum);
};

const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000" : "#fff";
};

interface DiskTypeBarChartProps {
  data: Array<{ name: string; count: number }>;
  colors: string[];
}

const DiskTypeBarChart: FC<DiskTypeBarChartProps> = ({ data, colors }) => {
  const maxCount = useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0),
    [data],
  );

  if (data.length === 0) {
    return <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.diskTypes} />;
  }

  return (
    <>
      <div className={dashboardStyles.storageChartWrapper}>
        <Flex
          direction={{ default: "row" }}
          alignItems={{ default: "alignItemsFlexEnd" }}
          justifyContent={{ default: "justifyContentCenter" }}
          spaceItems={{ default: "spaceItemsMd" }}
          style={{ height: "250px", width: "100%" }}
        >
          {data.map((item, index) => {
            const heightPercentage =
              maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const minHeight = item.count > 0 ? 10 : 0;
            const barColor = colors[index % colors.length];
            const textColor = getContrastColor(barColor);

            return (
              <Flex
                key={item.name}
                direction={{ default: "column" }}
                alignItems={{ default: "alignItemsCenter" }}
                spaceItems={{ default: "spaceItemsSm" }}
                style={{ flex: "1", maxWidth: "120px" }}
              >
                <FlexItem
                  style={{
                    height: "200px",
                    display: "flex",
                    alignItems: "flex-end",
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: `${Math.max(heightPercentage, minHeight)}%`,
                      backgroundColor: barColor,
                      transition: "height 0.3s ease",
                      borderRadius: "4px 4px 0 0",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      paddingTop: "4px",
                    }}
                    title={`${item.name}: ${item.count} VMs`}
                  >
                    <Content
                      component="small"
                      style={{
                        color: textColor,
                        fontWeight: "bold",
                        fontSize: "10px",
                      }}
                    >
                      {item.count}
                    </Content>
                  </div>
                </FlexItem>
                <FlexItem>
                  <Content
                    component="small"
                    style={{
                      fontSize: "12px",
                      textAlign: "center",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.name}
                  </Content>
                </FlexItem>
              </Flex>
            );
          })}
        </Flex>
      </div>
      <Content component="small" className={dashboardStyles.storageTotalsNote}>
        Totals may exceed the unique VM count because individual VMs can have
        multiple disk types
      </Content>
    </>
  );
};

const isViewMode = (value: string | number | undefined): value is ViewMode =>
  value === "totalSize" ||
  value === "vmCount" ||
  value === "vmCountByDiskType" ||
  value === "sharedDisks";

export const StorageOverview: FC<StorageOverviewProps> = ({
  diskSizeTier = {},
  diskTypes = {},
  totalVMs,
  totalWithSharedDisks,
  onDiskTierSelect,
  onTitleClick,
  legendVariant = "html",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("vmCount");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const totals = useMemo(
    () =>
      Object.values(diskSizeTier).reduce(
        (acc, tier) => ({
          totalSize: acc.totalSize + (tier?.totalSizeTB || 0),
          totalVMs: acc.totalVMs + (tier?.vmCount || 0),
        }),
        { totalSize: 0, totalVMs: 0 },
      ),
    [diskSizeTier],
  );

  const chartData = useMemo(
    () =>
      buildTierChartData(diskSizeTier, (tier) => {
        const count =
          viewMode === "totalSize"
            ? tier?.totalSizeTB || 0
            : tier?.vmCount || 0;
        return {
          count,
          countDisplay:
            viewMode === "totalSize" ? `${count.toFixed(2)}` : `${count}`,
        };
      }),
    [diskSizeTier, viewMode],
  );

  const diskTypeChartData = useMemo(() => {
    if (Object.keys(diskTypes).length === 0) {
      return [];
    }
    const orderIndex = (name: string): number => {
      const idx = DISK_TYPE_PREFERRED_ORDER.indexOf(name);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return Object.entries(diskTypes)
      .map(([diskTypeName, summary]) => ({
        name: diskTypeName,
        count: summary?.vmCount || 0,
      }))
      .sort((a, b) => orderIndex(a.name) - orderIndex(b.name));
  }, [diskTypes]);

  const sharedDisksChartData = useMemo(() => {
    if (
      totalWithSharedDisks === undefined ||
      totalVMs === undefined ||
      totalWithSharedDisks === 0
    ) {
      return null;
    }
    const withSharedDisks = Math.min(totalWithSharedDisks, totalVMs);
    const withoutSharedDisks = Math.max(0, totalVMs - withSharedDisks);
    return [
      {
        name: "With shared disks",
        count: withSharedDisks,
        countDisplay: `${withSharedDisks}`,
        legendCategory: "With shared disks",
      },
      {
        name: "No shared disks",
        count: withoutSharedDisks,
        countDisplay: `${withoutSharedDisks}`,
        legendCategory: "No shared disks",
      },
    ];
  }, [totalVMs, totalWithSharedDisks]);

  const tierLegend = useMemo(() => {
    const legendMap: Record<string, string> = {};
    chartData.forEach((slice, idx) => {
      const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
      if (color) {
        legendMap[slice.legendCategory] = color;
      }
    });
    return legendMap;
  }, [chartData]);

  const commonDonutProps = {
    height: 300,
    width: 420,
    donutThickness: 18,
    titleFontSize: 34,
    subTitleColor: "var(--pf-t--global--text--color--subtle)",
    legendVariant,
  };

  const handleDiskTierClick = (item: MigrationDonutChartDatum): void => {
    const diskRange =
      item.diskRange ??
      parseDiskTierLabelToRange(item.name) ??
      parseDiskTierLabelToRange(item.legendCategory);
    if (diskRange) {
      onDiskTierSelect?.(diskRange);
    }
  };

  const chartTitle = `${CHART_TITLE} — ${VIEW_MODE_LABELS[viewMode]}`;

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
      <Card
        className={`${dashboardStyles.card} ${dashboardStyles.storageCardOverflowHidden}`}
      >
        <CardTitle>
          <Flex
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
            className={dashboardStyles.storageFlexFullWidth}
          >
            <FlexItem>
              <DatabaseIcon /> Disks
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
                    className={dashboardStyles.storageMenuToggleMinWidth}
                  >
                    {VIEW_MODE_LABELS[viewMode]}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem key="vmCount" value="vmCount">
                    {VIEW_MODE_LABELS.vmCount}
                  </DropdownItem>
                  <DropdownItem
                    key="vmCountByDiskType"
                    value="vmCountByDiskType"
                  >
                    {VIEW_MODE_LABELS.vmCountByDiskType}
                  </DropdownItem>
                  <DropdownItem key="totalSize" value="totalSize">
                    {VIEW_MODE_LABELS.totalSize}
                  </DropdownItem>
                  <DropdownItem
                    key="sharedDisks"
                    value="sharedDisks"
                    isDisabled={
                      totalWithSharedDisks !== undefined &&
                      totalWithSharedDisks === 0
                    }
                  >
                    {VIEW_MODE_LABELS.sharedDisks}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ChartHeaderActions>
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {viewMode === "vmCountByDiskType" ? (
            <DiskTypeBarChart
              data={diskTypeChartData}
              colors={DISK_TYPE_BAR_COLORS}
            />
          ) : viewMode === "sharedDisks" ? (
            sharedDisksChartData && totalVMs !== undefined ? (
              <MigrationDonutChart
                {...commonDonutProps}
                data={sharedDisksChartData.map((item) => ({
                  ...item,
                  countDisplay: `${item.countDisplay} VMs`,
                }))}
                customColors={SHARED_DISKS_COLORS}
                title={`${totalVMs} VMs`}
                subTitle={`${totalWithSharedDisks ?? 0} with shared disks`}
                marginLeft="25%"
                tooltipLabelFormatter={({ datum, percent }) =>
                  `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
                }
              />
            ) : (
              <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.storage} />
            )
          ) : chartData.length === 0 ? (
            <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.storage} />
          ) : (
            <MigrationDonutChart
              {...commonDonutProps}
              data={chartData.map((item) => ({
                ...item,
                countDisplay:
                  viewMode === "totalSize"
                    ? `${item.countDisplay} TB`
                    : `${item.countDisplay} VMs`,
              }))}
              legend={tierLegend}
              title={
                viewMode === "totalSize"
                  ? `${totals.totalSize.toFixed(2)} TB`
                  : `${totals.totalVMs} VMs`
              }
              subTitle={
                viewMode === "totalSize"
                  ? `${totals.totalVMs} VMs`
                  : `${totals.totalSize.toFixed(2)} TB`
              }
              legendLabelFormatter={({ x, countDisplay }) =>
                `${x} (${countDisplay})`
              }
              tooltipLabelFormatter={({ datum, percent }) =>
                `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
              }
              onItemClick={
                viewMode === "vmCount" || viewMode === "totalSize"
                  ? handleDiskTierClick
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

StorageOverview.displayName = "StorageOverview";

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
import type React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";
import { createVMFilterURL } from "./vmNavigation";

interface DiskTierData {
  vmCount?: number;
  totalSizeTB?: number;
}

interface StorageOverviewProps {
  diskSizeTier?: Record<string, DiskTierData>;
  diskTypes?: Record<string, DiskTierData>;
  totalVMs?: number;
  totalWithSharedDisks?: number;
  isExportMode?: boolean;
  exportAllViews?: boolean;
}

type ViewMode = "totalSize" | "vmCount" | "vmCountByDiskType" | "sharedDisks";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  totalSize: "Total disk size by tier",
  vmCount: "VM count by disk size tier",
  vmCountByDiskType: "VM count by disk type",
  sharedDisks: "Shared disks VS. No shared disks",
};

const TIER_CONFIG: Record<
  string,
  { order: number; label: string; legendCategory: string }
> = {
  Easy: { order: 0, label: "0-10 TB", legendCategory: "Easy" },
  Medium: { order: 1, label: "11-20 TB", legendCategory: "Medium" },
  Hard: { order: 2, label: "21-50 TB", legendCategory: "Hard" },
  White: { order: 3, label: "> 50 TB", legendCategory: "White glove" },
};

type TierChartDatum = {
  name: string;
  count: number;
  countDisplay: string;
  legendCategory: string;
};

function buildTierChartData(
  summary: Record<string, DiskTierData>,
  tierConfig: Record<
    string,
    { order: number; label: string; legendCategory: string }
  >,
  selector: (tier: DiskTierData) => {
    count: number;
    countDisplay: string;
  },
): TierChartDatum[] {
  if (!summary) return [];

  const getTierPrefix = (key: string): string | null => {
    for (const prefix of Object.keys(tierConfig)) {
      if (key.startsWith(prefix)) return prefix;
    }
    return null;
  };

  return Object.entries(summary)
    .sort(([keyA], [keyB]) => {
      const prefixA = getTierPrefix(keyA);
      const prefixB = getTierPrefix(keyB);
      const orderA = prefixA ? tierConfig[prefixA].order : 999;
      const orderB = prefixB ? tierConfig[prefixB].order : 999;
      return orderA - orderB;
    })
    .map(([key, tier]) => {
      const prefix = getTierPrefix(key);
      const display = prefix
        ? tierConfig[prefix]
        : { label: key, legendCategory: "Unknown" };
      const { count, countDisplay } = selector(tier);
      return {
        name: display.label,
        count,
        countDisplay,
        legendCategory: display.legendCategory,
      };
    });
}

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
  isExportMode?: boolean;
}

const DiskTypeBarChart: React.FC<DiskTypeBarChartProps> = ({
  data,
  colors,
  isExportMode = false,
}) => {
  const maxCount = useMemo(() => {
    return data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={dashboardStyles.storageNoDataContainer}>
        No Data Available
      </div>
    );
  }

  return (
    <>
      <div className={dashboardStyles.storageChartWrapper}>
        <Flex
          direction={{ default: "row" }}
          alignItems={{ default: "alignItemsFlexEnd" }}
          justifyContent={{ default: "justifyContentCenter" }}
          spaceItems={{ default: "spaceItemsMd" }}
          style={{ height: isExportMode ? "180px" : "250px", width: "100%" }}
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
                    height: isExportMode ? "140px" : "200px",
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
      {!isExportMode && (
        <Content
          component="small"
          className={dashboardStyles.storageTotalsNote}
        >
          Totals may exceed the unique VM count because individual VMs can have
          multiple disk types
        </Content>
      )}
    </>
  );
};

export const StorageOverview: React.FC<StorageOverviewProps> = ({
  diskSizeTier = {},
  diskTypes = {},
  totalVMs,
  totalWithSharedDisks,
  isExportMode = false,
  exportAllViews = false,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("vmCount");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const totals = useMemo(() => {
    if (!diskSizeTier) return { totalSize: 0, totalVMs: 0 };

    return Object.values(diskSizeTier).reduce(
      (acc, tier) => ({
        totalSize: acc.totalSize + (tier?.totalSizeTB || 0),
        totalVMs: acc.totalVMs + (tier?.vmCount || 0),
      }),
      { totalSize: 0, totalVMs: 0 },
    );
  }, [diskSizeTier]);

  const chartData = useMemo(() => {
    if (!diskSizeTier) return [];
    return buildTierChartData(diskSizeTier, TIER_CONFIG, (tier) => {
      const count =
        viewMode === "totalSize" ? tier?.totalSizeTB || 0 : tier?.vmCount || 0;
      return {
        count,
        countDisplay:
          viewMode === "totalSize" ? `${count.toFixed(2)}` : `${count}`,
      };
    });
  }, [diskSizeTier, viewMode]);

  const diskTypeChartData = useMemo(() => {
    if (!diskTypes || Object.keys(diskTypes).length === 0) return [];
    const preferredOrder = ["VMFS", "NFS", "vSAN", "RDM", "vVols"];
    const orderIndex = (name: string): number => {
      const idx = preferredOrder.indexOf(name);
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
    )
      return null;
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

  const chartDataForVmCount = useMemo(() => {
    if (!exportAllViews || !diskSizeTier) return [];
    return buildTierChartData(diskSizeTier, TIER_CONFIG, (tier) => {
      const count = tier?.vmCount || 0;
      return { count, countDisplay: `${count}` };
    });
  }, [exportAllViews, diskSizeTier]);

  const chartDataForTotalSize = useMemo(() => {
    if (!exportAllViews || !diskSizeTier) return [];
    return buildTierChartData(diskSizeTier, TIER_CONFIG, (tier) => {
      const count = tier?.totalSizeTB || 0;
      return { count, countDisplay: `${count.toFixed(2)}` };
    });
  }, [exportAllViews, diskSizeTier]);

  const diskTypeBarColors = [
    "#0066cc",
    "#5e40be",
    "#b6a6e9",
    "#b98412",
    "#73C5C5",
  ];

  const sharedDisksColors = {
    "With shared disks": "#b98412",
    "No shared disks": "#0066cc",
  };

  const commonDonutProps = useMemo(
    () => ({
      height: 300,
      width: 420,
      donutThickness: 9,
      titleFontSize: 34,
      subTitleColor: "#9a9da0",
    }),
    [],
  );

  const onDropdownToggle = (): void => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ): void => {
    if (
      value === "totalSize" ||
      value === "vmCount" ||
      value === "vmCountByDiskType" ||
      value === "sharedDisks"
    ) {
      setViewMode(value);
    }
    setIsDropdownOpen(false);
  };

  const parseDiskTierToFilter = (
    tier: string,
  ): { min: number; max?: number } | null => {
    const MB_IN_TB = 1024 * 1024;
    const normalized = tier.trim();

    const diskRangeMappings: Record<
      string,
      { min: number; max: number | undefined }
    > = {
      "0-10 TB": { min: 0, max: 10 * MB_IN_TB },
      "11-20 TB": { min: 10 * MB_IN_TB + 1, max: 20 * MB_IN_TB },
      "21-50 TB": { min: 20 * MB_IN_TB + 1, max: 50 * MB_IN_TB },
      "50+ TB": { min: 50 * MB_IN_TB + 1, max: undefined },
      "> 50 TB": { min: 50 * MB_IN_TB + 1, max: undefined },
    };

    if (normalized in diskRangeMappings) {
      return diskRangeMappings[normalized];
    }

    return null;
  };

  const handleDiskTierClick = (item: { name: string }) => {
    const diskRange = parseDiskTierToFilter(item.name);
    if (diskRange) {
      navigate(createVMFilterURL({ diskRange }));
    }
  };

  const handleTitleClick = () => {
    navigate(createVMFilterURL({}));
  };

  return (
    <Card
      className={`${isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card} ${isExportMode ? dashboardStyles.storageCardOverflowVisible : dashboardStyles.storageCardOverflowHidden}`}
      id="storage-overview"
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
                    className={dashboardStyles.storageMenuToggleMinWidth}
                  >
                    {VIEW_MODE_LABELS[viewMode]}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem key="vmCount" value="vmCount">
                    VM count by disk size tier
                  </DropdownItem>
                  <DropdownItem
                    key="vmCountByDiskType"
                    value="vmCountByDiskType"
                  >
                    VM count by disk type
                  </DropdownItem>
                  <DropdownItem key="totalSize" value="totalSize">
                    Total disk size by tier
                  </DropdownItem>
                  <DropdownItem
                    key="sharedDisks"
                    value="sharedDisks"
                    isDisabled={
                      totalWithSharedDisks !== undefined &&
                      totalWithSharedDisks === 0
                    }
                  >
                    Shared disks VS. No shared disks
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        {!isExportMode || !exportAllViews ? (
          viewMode === "vmCountByDiskType" ? (
            <DiskTypeBarChart
              data={diskTypeChartData}
              colors={diskTypeBarColors}
              isExportMode={isExportMode}
            />
          ) : viewMode === "sharedDisks" ? (
            sharedDisksChartData && totalVMs !== undefined ? (
              <MigrationDonutChart
                {...commonDonutProps}
                data={sharedDisksChartData.map((item) => ({
                  ...item,
                  countDisplay: `${item.countDisplay} VMs`,
                }))}
                customColors={sharedDisksColors}
                title={`${totalVMs} VMs`}
                subTitle={`${totalWithSharedDisks ?? 0} with shared disks`}
                itemsPerRow={2}
                marginLeft="25%"
                labelFontSize={18}
                tooltipLabelFormatter={({ datum, percent }) =>
                  `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
                }
              />
            ) : (
              <div className={dashboardStyles.storageNoDataContainer}>
                No Data Available
              </div>
            )
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
              itemsPerRow={Math.ceil(chartData.length / 2)}
              tooltipLabelFormatter={({ datum, percent }) =>
                `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
              }
              onItemClick={!isExportMode ? handleDiskTierClick : undefined}
              onTitleClick={!isExportMode ? handleTitleClick : undefined}
            />
          )
        ) : (
          <>
            <div className={dashboardStyles.storageExportSectionMargin}>
              <div className={dashboardStyles.storageExportSectionTitle}>
                {VIEW_MODE_LABELS.vmCountByDiskType}
              </div>
              <DiskTypeBarChart
                data={diskTypeChartData}
                colors={diskTypeBarColors}
                isExportMode={isExportMode}
              />
            </div>
            <div className={dashboardStyles.storageExportSectionMargin}>
              <div className={dashboardStyles.storageExportSectionTitle}>
                {VIEW_MODE_LABELS.vmCount}
              </div>
              <MigrationDonutChart
                {...commonDonutProps}
                data={chartDataForVmCount.map((item) => ({
                  ...item,
                  countDisplay: `${item.countDisplay} VMs`,
                }))}
                title={`${totals.totalVMs} VMs`}
                subTitle={`${totals.totalSize.toFixed(2)} TB`}
                itemsPerRow={Math.ceil(chartDataForVmCount.length / 2)}
                tooltipLabelFormatter={({ datum, percent }) =>
                  `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
                }
              />
            </div>
            <div className={dashboardStyles.storageExportSectionMargin}>
              <div className={dashboardStyles.storageExportSectionTitle}>
                {VIEW_MODE_LABELS.totalSize}
              </div>
              <MigrationDonutChart
                {...commonDonutProps}
                data={chartDataForTotalSize.map((item) => ({
                  ...item,
                  countDisplay: `${item.countDisplay} TB`,
                }))}
                title={`${totals.totalSize.toFixed(2)} TB`}
                subTitle={`${totals.totalVMs} VMs`}
                itemsPerRow={Math.ceil(chartDataForTotalSize.length / 2)}
                tooltipLabelFormatter={({ datum, percent }) =>
                  `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
                }
              />
            </div>
            {sharedDisksChartData && totalVMs !== undefined && (
              <div>
                <div className={dashboardStyles.storageExportSectionTitle}>
                  {VIEW_MODE_LABELS.sharedDisks}
                </div>
                <MigrationDonutChart
                  {...commonDonutProps}
                  data={sharedDisksChartData.map((item) => ({
                    ...item,
                    countDisplay: `${item.countDisplay} VMs`,
                  }))}
                  customColors={sharedDisksColors}
                  title={`${totalVMs} VMs`}
                  subTitle={`${totalWithSharedDisks ?? 0} with shared disks`}
                  itemsPerRow={2}
                  marginLeft="25%"
                  labelFontSize={16}
                  tooltipLabelFormatter={({ datum, percent }) =>
                    `${datum.x}: ${datum.countDisplay}\n${percent.toFixed(1)}%`
                  }
                />
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

StorageOverview.displayName = "StorageOverview";

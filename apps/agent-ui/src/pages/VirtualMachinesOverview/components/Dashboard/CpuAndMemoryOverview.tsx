import { css } from "@emotion/css";
import {
  dashboardStyles,
  MigrationDonutChart,
} from "@openshift-migration-advisor/shared-components";
import {
  Card,
  CardBody,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyStateVariant,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
} from "@patternfly/react-core";
import { DataProcessorIcon, InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo, useState } from "react";
import { AppEmptyState } from "../../../../common/components";
import {
  ChartDownloadButton,
  ChartHeaderActions,
} from "../Export/ChartDownloadButton";
import {
  type NavigateToVMFilters,
  useChartDrillDown,
} from "../VirtualMachinesTab/vmNavigation";
import { parseMemoryTierLabelToRange } from "../VirtualMachinesTab/vmTableShared";

export type CpuAndMemoryViewMode = "memoryTiers" | "vcpuTiers";

interface CpuAndMemoryOverviewProps {
  cpuTierDistribution?: Record<string, number>;
  memoryTierDistribution?: Record<string, number>;
  memoryTotalGB?: number;
  cpuTotalCores?: number;
  isExportMode?: boolean;
  viewMode?: CpuAndMemoryViewMode;
  onNavigateToVMFilters?: NavigateToVMFilters;
}

const cardSubtitleStyle = css`
  color: #6a6e73;
  font-size: 0.85rem;
`;

const colorPalette = [
  "#0066cc",
  "#5e40be",
  "#b6a6e9",
  "#73c5c5",
  "#b98412",
  "#28a745",
  "#f0ad4e",
  "#d9534f",
];

export const CpuAndMemoryOverview: React.FC<CpuAndMemoryOverviewProps> = ({
  cpuTierDistribution = {},
  memoryTierDistribution = {},
  memoryTotalGB,
  cpuTotalCores,
  isExportMode = false,
  viewMode: viewModeProp,
  onNavigateToVMFilters,
}) => {
  const navigateToVMs = useChartDrillDown(onNavigateToVMFilters);
  const [internalViewMode, setViewMode] =
    useState<CpuAndMemoryViewMode>("memoryTiers");
  const viewMode = viewModeProp ?? internalViewMode;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const downloadTitle =
    viewMode === "memoryTiers"
      ? "CPU & memory — Memory size tiers"
      : "CPU & memory — vCPU count tiers";

  const memorySlices = useMemo(() => {
    return Object.entries(memoryTierDistribution)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        const minA = Number.parseInt(a[0], 10) || 0;
        const minB = Number.parseInt(b[0], 10) || 0;
        return minA - minB;
      })
      .map(([tier, count]) => ({
        name: /gb$/i.test(tier.trim()) ? tier : `${tier} GB`,
        count,
        countDisplay: `${count} VMs`,
        legendCategory: tier,
        memoryRange: parseMemoryTierLabelToRange(tier),
      }));
  }, [memoryTierDistribution]);

  const vcpuSlices = useMemo(() => {
    return Object.entries(cpuTierDistribution)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        const minA = Number.parseInt(a[0], 10) || 0;
        const minB = Number.parseInt(b[0], 10) || 0;
        return minA - minB;
      })
      .map(([tier, count]) => ({
        name: /cores?$/i.test(tier.trim()) ? tier : `${tier} cores`,
        count,
        countDisplay: `${count} VMs`,
        legendCategory: tier,
      }));
  }, [cpuTierDistribution]);

  const activeSlices = viewMode === "memoryTiers" ? memorySlices : vcpuSlices;

  const legend = useMemo(() => {
    const legendMap: Record<string, string> = {};
    activeSlices.forEach((slice, idx) => {
      legendMap[slice.legendCategory] = colorPalette[idx % colorPalette.length];
    });
    return legendMap;
  }, [activeSlices]);

  const totalVMs = useMemo(() => {
    return activeSlices.reduce((sum, s) => sum + s.count, 0);
  }, [activeSlices]);

  // Parse memory tier string to client-side filter format
  const parseMemoryTierToFilter = (
    tier: string,
  ): { min: number; max?: number } | null => {
    return parseMemoryTierLabelToRange(tier) ?? null;
  };

  const handleMemoryTierClick = (item: {
    name: string;
    legendCategory: string;
    memoryRange?: { min: number; max?: number };
  }) => {
    const memoryRange =
      item.memoryRange ??
      parseMemoryTierToFilter(item.legendCategory) ??
      parseMemoryTierToFilter(item.name);
    if (memoryRange) {
      navigateToVMs({ memoryRange });
    }
  };

  const handleTitleClick = () => {
    navigateToVMs({});
  };

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="cpu-memory-overview"
    >
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>
            <div>
              <div>
                <DataProcessorIcon /> CPU &amp; memory
              </div>
              <div className={cardSubtitleStyle}>
                {viewMode === "memoryTiers"
                  ? "Memory size tiers"
                  : "vCPU count tiers"}
              </div>
            </div>
          </FlexItem>
          {!isExportMode && (
            <ChartHeaderActions>
              <Dropdown
                isOpen={isDropdownOpen}
                onSelect={(_event, value) => {
                  if (value === "memoryTiers" || value === "vcpuTiers") {
                    setViewMode(value);
                  }
                  setIsDropdownOpen(false);
                }}
                onOpenChange={setIsDropdownOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    isExpanded={isDropdownOpen}
                  >
                    {viewMode === "memoryTiers"
                      ? "VM distribution by memory size tier"
                      : "VM distribution by vCPU count tier"}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem key="memoryTiers" value="memoryTiers">
                    VM distribution by memory size tier
                  </DropdownItem>
                  <DropdownItem key="vcpuTiers" value="vcpuTiers">
                    VM distribution by vCPU count tier
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
              <ChartDownloadButton
                chartId={`cpu-memory-${viewMode}`}
                title={downloadTitle}
                getNode={() => (
                  <CpuAndMemoryOverview
                    cpuTierDistribution={cpuTierDistribution}
                    memoryTierDistribution={memoryTierDistribution}
                    memoryTotalGB={memoryTotalGB}
                    cpuTotalCores={cpuTotalCores}
                    isExportMode
                    viewMode={viewMode}
                  />
                )}
              />
            </ChartHeaderActions>
          )}
        </Flex>
      </CardTitle>
      <CardBody className={dashboardStyles.cardBodyScrollable}>
        {activeSlices.length === 0 ? (
          <AppEmptyState
            titleText="No data available"
            icon={InboxIcon}
            variant={EmptyStateVariant.xs}
            wrapInBullseye={false}
          />
        ) : (
          <MigrationDonutChart
            data={activeSlices}
            height={300}
            width={420}
            donutThickness={18}
            titleFontSize={34}
            legend={legend}
            title={`${totalVMs} VMs`}
            subTitle={
              viewMode === "memoryTiers"
                ? typeof memoryTotalGB === "number"
                  ? `${memoryTotalGB.toLocaleString()} GB`
                  : undefined
                : typeof cpuTotalCores === "number"
                  ? `${cpuTotalCores.toLocaleString()} Cores`
                  : undefined
            }
            subTitleColor="#9a9da0"
            legendLabelFormatter={({ x, countDisplay }) =>
              `${x} (${countDisplay})`
            }
            tooltipLabelFormatter={({ datum, percent }) =>
              `${datum.countDisplay}\n${percent.toFixed(1)}%`
            }
            onItemClick={
              !isExportMode && viewMode === "memoryTiers"
                ? handleMemoryTierClick
                : undefined
            }
            onTitleClick={!isExportMode ? handleTitleClick : undefined}
          />
        )}
      </CardBody>
    </Card>
  );
};

CpuAndMemoryOverview.displayName = "CpuAndMemoryOverview";

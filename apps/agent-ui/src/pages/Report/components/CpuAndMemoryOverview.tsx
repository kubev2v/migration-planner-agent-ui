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
import type React from "react";
import { useMemo, useState } from "react";
import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";
import { type NavigateToVMFilters, useChartDrillDown } from "./vmNavigation";
import { parseMemoryTierLabelToRange } from "./vmTableShared";

interface CpuAndMemoryOverviewProps {
  cpuTierDistribution?: Record<string, number>;
  memoryTierDistribution?: Record<string, number>;
  memoryTotalGB?: number;
  cpuTotalCores?: number;
  isExportMode?: boolean;
  onNavigateToVMFilters?: NavigateToVMFilters;
}

type ViewMode = "memoryTiers" | "vcpuTiers";

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
  onNavigateToVMFilters,
}) => {
  const navigateToVMs = useChartDrillDown(onNavigateToVMFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("memoryTiers");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
              {!isExportMode && (
                <div className={cardSubtitleStyle}>
                  {viewMode === "memoryTiers"
                    ? "Memory size tiers"
                    : "vCPU count tiers"}
                </div>
              )}
            </div>
          </FlexItem>
          {!isExportMode && (
            <FlexItem>
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
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        <MigrationDonutChart
          data={activeSlices}
          height={300}
          width={420}
          donutThickness={18}
          titleFontSize={34}
          legend={legend}
          legendWidth={680}
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
          itemsPerRow={Math.ceil(activeSlices.length / 2)}
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
      </CardBody>
    </Card>
  );
};

CpuAndMemoryOverview.displayName = "CpuAndMemoryOverview";

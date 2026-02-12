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
import { useNavigate } from "react-router-dom";
import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";
import { createVMFilterURL } from "./vmNavigation";

interface CpuAndMemoryOverviewProps {
  cpuTierDistribution?: Record<string, number>;
  memoryTierDistribution?: Record<string, number>;
  memoryTotalGB?: number;
  cpuTotalCores?: number;
  isExportMode?: boolean;
}

type ViewMode = "memoryTiers" | "vcpuTiers";

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
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("memoryTiers");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const memorySlices = useMemo(() => {
    return Object.entries(memoryTierDistribution)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        const minA = Number.parseInt(a[0]) || 0;
        const minB = Number.parseInt(b[0]) || 0;
        return minA - minB;
      })
      .map(([tier, count]) => ({
        name: /gb$/i.test(tier.trim()) ? tier : `${tier} GB`,
        count,
        countDisplay: `${count} VMs`,
        legendCategory: tier,
      }));
  }, [memoryTierDistribution]);

  const vcpuSlices = useMemo(() => {
    return Object.entries(cpuTierDistribution)
      .filter(([, count]) => count > 0)
      .sort((a, b) => {
        const minA = Number.parseInt(a[0]) || 0;
        const minB = Number.parseInt(b[0]) || 0;
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
    const MB_IN_GB = 1024;
    const normalized = tier.trim();

    // Memory range mappings matching VMTable
    const memoryRangeMappings: Record<
      string,
      { min: number; max: number | undefined }
    > = {
      "0-4": { min: 0, max: 4 * MB_IN_GB },
      "0-4 GB": { min: 0, max: 4 * MB_IN_GB },
      "5-16": { min: 4 * MB_IN_GB + 1, max: 16 * MB_IN_GB },
      "5-16 GB": { min: 4 * MB_IN_GB + 1, max: 16 * MB_IN_GB },
      "17-32": { min: 16 * MB_IN_GB + 1, max: 32 * MB_IN_GB },
      "17-32 GB": { min: 16 * MB_IN_GB + 1, max: 32 * MB_IN_GB },
      "33-64": { min: 32 * MB_IN_GB + 1, max: 64 * MB_IN_GB },
      "33-64 GB": { min: 32 * MB_IN_GB + 1, max: 64 * MB_IN_GB },
      "65-128": { min: 64 * MB_IN_GB + 1, max: 128 * MB_IN_GB },
      "65-128 GB": { min: 64 * MB_IN_GB + 1, max: 128 * MB_IN_GB },
      "129-256": { min: 128 * MB_IN_GB + 1, max: 256 * MB_IN_GB },
      "129-256 GB": { min: 128 * MB_IN_GB + 1, max: 256 * MB_IN_GB },
      "256+": { min: 256 * MB_IN_GB + 1, max: undefined },
      "256+ GB": { min: 256 * MB_IN_GB + 1, max: undefined },
    };

    if (normalized in memoryRangeMappings) {
      return memoryRangeMappings[normalized];
    }

    return null;
  };

  const handleMemoryTierClick = (item: {
    name: string;
    legendCategory: string;
  }) => {
    const memoryRange = parseMemoryTierToFilter(item.legendCategory);
    if (memoryRange) {
      navigate(createVMFilterURL({ memoryRange }));
    }
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
                <div>
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
          donutThickness={9}
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
          itemsPerRow={Math.ceil(activeSlices.length / 2)}
          labelFontSize={18}
          tooltipLabelFormatter={({ datum, percent }) =>
            `${datum.countDisplay}\n${percent.toFixed(1)}%`
          }
          onItemClick={
            !isExportMode && viewMode === "memoryTiers"
              ? handleMemoryTierClick
              : undefined
          }
        />
      </CardBody>
    </Card>
  );
};

CpuAndMemoryOverview.displayName = "CpuAndMemoryOverview";

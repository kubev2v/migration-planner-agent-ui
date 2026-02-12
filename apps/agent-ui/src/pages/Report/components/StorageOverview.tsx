import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { DatabaseIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo } from "react";
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
  isExportMode?: boolean;
}

const TIER_CONFIG: Record<string, { order: number; label: string }> = {
  Easy: { order: 0, label: "0-10 TB" },
  Medium: { order: 1, label: "11-20 TB" },
  Hard: { order: 2, label: "21-50 TB" },
  White: { order: 3, label: "> 50 TB" },
};

export const StorageOverview: React.FC<StorageOverviewProps> = ({
  diskSizeTier = {},
  isExportMode = false,
}) => {
  const navigate = useNavigate();

  const { chartData, totalSize, totalVMs } = useMemo(() => {
    const getTierPrefix = (key: string): string | null => {
      for (const prefix of Object.keys(TIER_CONFIG)) {
        if (key.startsWith(prefix)) return prefix;
      }
      return null;
    };

    const data = Object.entries(diskSizeTier)
      .sort(([keyA], [keyB]) => {
        const prefixA = getTierPrefix(keyA);
        const prefixB = getTierPrefix(keyB);
        const orderA = prefixA ? TIER_CONFIG[prefixA].order : 999;
        const orderB = prefixB ? TIER_CONFIG[prefixB].order : 999;
        return orderA - orderB;
      })
      .map(([key, tier]) => {
        const prefix = getTierPrefix(key);
        const display = prefix ? TIER_CONFIG[prefix] : { label: key };
        const vmCount = tier?.vmCount || 0;
        const totalSizeTB = tier?.totalSizeTB || 0;
        return {
          name: display.label,
          count: vmCount,
          countDisplay: `${vmCount} VMs`,
          legendCategory: display.label,
          totalSizeTB,
        };
      });

    const totalVMs = data.reduce((sum, d) => sum + d.count, 0);
    const totalSize = data.reduce((sum, d) => sum + d.totalSizeTB, 0);

    return { chartData: data, totalSize, totalVMs };
  }, [diskSizeTier]);

  const legend = useMemo(() => {
    const colors = ["#0066cc", "#5e40be", "#b6a6e9", "#73c5c5"];
    const legendMap: Record<string, string> = {};
    chartData.forEach((item, idx) => {
      legendMap[item.legendCategory] = colors[idx % colors.length];
    });
    return legendMap;
  }, [chartData]);

  // Parse disk tier string to client-side filter format
  const parseDiskTierToFilter = (
    tier: string,
  ): { min: number; max?: number } | null => {
    const MB_IN_TB = 1024 * 1024;
    const normalized = tier.trim();

    // Disk range mappings matching VMTable
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

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="storage-overview"
    >
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>
            <DatabaseIcon /> Disks
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <MigrationDonutChart
          data={chartData}
          height={300}
          width={420}
          donutThickness={9}
          titleFontSize={34}
          legend={legend}
          title={`${totalVMs} VMs`}
          subTitle={`${totalSize.toFixed(2)} TB`}
          subTitleColor="#9a9da0"
          itemsPerRow={Math.ceil(chartData.length / 2)}
          labelFontSize={18}
          tooltipLabelFormatter={({ datum, percent }) =>
            `${datum.countDisplay}\n${percent.toFixed(1)}%`
          }
          onItemClick={!isExportMode ? handleDiskTierClick : undefined}
        />
      </CardBody>
    </Card>
  );
};

StorageOverview.displayName = "StorageOverview";

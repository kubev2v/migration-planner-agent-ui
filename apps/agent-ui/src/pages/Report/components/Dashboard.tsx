import type {
  Infra,
  InventoryData,
  VMResourceBreakdown,
  VMs,
} from "@migration-planner-ui/agent-client/models";
import {
  Gallery,
  GalleryItem,
  Grid,
  GridItem,
  PageSection,
} from "@patternfly/react-core";
import type React from "react";
import { ClustersOverview } from "./ClustersOverview";
import { CpuAndMemoryOverview } from "./CpuAndMemoryOverview";
import { dashboardStyles } from "./dashboardStyles";
import { ErrorTable } from "./ErrorTable";
import { HostsOverview } from "./HostsOverview";
import { NetworkOverview } from "./NetworkOverview";
import { OSDistribution } from "./OSDistribution";
import { StorageOverview } from "./StorageOverview";
import { VMMigrationStatus } from "./VMMigrationStatus";
import { WarningsTable } from "./WarningsTable";

interface DashboardProps {
  infra: Infra;
  cpuCores?: VMResourceBreakdown;
  ramGB?: VMResourceBreakdown;
  vms: VMs;
  isExportMode?: boolean;
  clusters?: { [key: string]: InventoryData };
  isAggregateView?: boolean;
  clusterFound?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  infra,
  cpuCores,
  ramGB,
  vms,
  isExportMode,
  clusters,
  isAggregateView = true,
  clusterFound = true,
}) => {
  // Transform osInfo to include both count and supported fields
  const osData = vms.osInfo
    ? Object.entries(vms.osInfo).reduce(
        (acc, [osName, osInfo]) => {
          acc[osName] = {
            count: osInfo.count,
            supported: osInfo.supported,
            upgradeRecommendation: osInfo.upgradeRecommendation || "",
          };
          return acc;
        },
        {} as {
          [osName: string]: {
            count: number;
            supported: boolean;
            upgradeRecommendation: string;
          };
        },
      )
    : Object.entries(vms.os || {}).reduce(
        (acc, [osName, count]) => {
          acc[osName] = {
            count: count,
            supported: true,
            upgradeRecommendation: "",
          };
          return acc;
        },
        {} as {
          [osName: string]: {
            count: number;
            supported: boolean;
            upgradeRecommendation: string;
          };
        },
      );

  if (!clusterFound && !isAggregateView) {
    return (
      <PageSection hasBodyWrapper={false} className={dashboardStyles.container}>
        <Grid hasGutter>
          <GridItem span={12}>
            No data is available for the selected cluster.
          </GridItem>
        </Grid>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} className={dashboardStyles.container}>
      <Grid hasGutter>
        <GridItem span={12} data-export-block={isExportMode ? "2" : undefined}>
          <Gallery hasGutter minWidths={{ default: "40%" }}>
            <GalleryItem>
              <VMMigrationStatus
                data={{
                  migratable: vms.totalMigratable || 0,
                  nonMigratable: Math.max(
                    0,
                    (vms.total || 0) - (vms.totalMigratable || 0),
                  ),
                }}
                isExportMode={isExportMode}
              />
            </GalleryItem>
            <GalleryItem>
              <OSDistribution osData={osData} isExportMode={isExportMode} />
            </GalleryItem>
          </Gallery>
        </GridItem>

        <GridItem span={12} data-export-block={isExportMode ? "3" : undefined}>
          <Gallery hasGutter minWidths={{ default: "40%" }}>
            <GalleryItem>
              <CpuAndMemoryOverview
                isExportMode={isExportMode}
                cpuTierDistribution={vms.distributionByCpuTier}
                memoryTierDistribution={vms.distributionByMemoryTier}
                memoryTotalGB={ramGB?.total}
                cpuTotalCores={cpuCores?.total}
              />
            </GalleryItem>
            <GalleryItem>
              <StorageOverview
                diskSizeTier={vms.diskSizeTier ?? {}}
                diskTypes={vms.diskTypes ?? {}}
                isExportMode={isExportMode}
              />
            </GalleryItem>
          </Gallery>
        </GridItem>

        {isAggregateView ? (
          <GridItem
            span={12}
            data-export-block={isExportMode ? "4" : undefined}
          >
            <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
              <GalleryItem>
                <ClustersOverview
                  clustersPerDatacenter={infra.clustersPerDatacenter ?? []}
                  isExportMode={isExportMode}
                  clusters={clusters}
                />
              </GalleryItem>
              <GalleryItem>
                <HostsOverview
                  hosts={infra.hosts}
                  isExportMode={isExportMode}
                />
              </GalleryItem>
            </Gallery>
          </GridItem>
        ) : (
          <GridItem
            span={12}
            data-export-block={isExportMode ? "4" : undefined}
          >
            <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
              <GalleryItem>
                <HostsOverview
                  hosts={infra.hosts}
                  isExportMode={isExportMode}
                />
              </GalleryItem>
              <GalleryItem>
                <NetworkOverview
                  infra={infra}
                  nicCount={vms.nicCount}
                  distributionByNicCount={vms.distributionByNicCount}
                  isExportMode={isExportMode}
                />
              </GalleryItem>
            </Gallery>
          </GridItem>
        )}
        {isAggregateView && (
          <GridItem
            span={12}
            data-export-block={isExportMode ? "4a" : undefined}
          >
            <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
              <GalleryItem>
                <NetworkOverview
                  infra={infra}
                  nicCount={vms.nicCount}
                  distributionByNicCount={vms.distributionByNicCount}
                  isExportMode={isExportMode}
                />
              </GalleryItem>
            </Gallery>
          </GridItem>
        )}

        <GridItem span={12} data-export-block={isExportMode ? "5" : undefined}>
          <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
            <GalleryItem>
              <WarningsTable
                warnings={vms.migrationWarnings || []}
                isExportMode={isExportMode}
              />
            </GalleryItem>
            <GalleryItem>
              <ErrorTable
                errors={vms.notMigratableReasons || []}
                isExportMode={isExportMode}
              />
            </GalleryItem>
          </Gallery>
        </GridItem>
      </Grid>
    </PageSection>
  );
};

Dashboard.displayName = "Dashboard";

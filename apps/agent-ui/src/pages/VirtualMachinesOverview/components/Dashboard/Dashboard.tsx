import type {
  Infra,
  InventoryData,
  VMResourceBreakdown,
  VMs,
} from "@openshift-migration-advisor/agent-sdk";
import {
  buildClusterDetailRows,
  buildClusterDetails,
  buildInfrastructureSummary,
  HostPowerStates,
  InfrastructureSummary,
  OSDistribution,
  type OSDistributionEntry,
  VCenterClusterDetails,
  VmPowerStates,
} from "@openshift-migration-advisor/shared-components";
import { Gallery, GalleryItem, Grid, GridItem } from "@patternfly/react-core";
import { InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo } from "react";
import { AppEmptyState } from "../../../../common/components";
import type { NavigateToVMFilters } from "../VirtualMachinesTab/vmNavigation";
import { ClustersOverview } from "./ClustersOverview";
import { CpuAndMemoryOverview } from "./CpuAndMemoryOverview";
import { ErrorTable } from "./ErrorTable";
import { HostsOverview } from "./HostsOverview";
import { NetworkOverview } from "./NetworkOverview";
import { StorageOverview } from "./StorageOverview";
import { VMMigrationStatus } from "./VMMigrationStatus";
import { WarningsTable } from "./WarningsTable";

interface DashboardProps {
  infra: Infra;
  cpuCores?: VMResourceBreakdown;
  ramGB?: VMResourceBreakdown;
  vms: VMs;
  clusters?: { [key: string]: InventoryData };
  vcenterVersion?: string;
  vcenterId?: string;
  isAggregateView?: boolean;
  clusterFound?: boolean;
  onConcernClick?: (concernLabel: string) => void;
  onNavigateToVMFilters?: NavigateToVMFilters;
}

export const Dashboard: React.FC<DashboardProps> = ({
  infra,
  cpuCores,
  ramGB,
  vms,
  clusters,
  vcenterVersion,
  vcenterId,
  isAggregateView = true,
  clusterFound = true,
  onConcernClick,
  onNavigateToVMFilters,
}) => {
  // Transform osInfo to include both count and supported fields
  const osData = vms.osInfo
    ? Object.entries(vms.osInfo).reduce(
        (acc, [osName, osInfo]) => {
          acc[osName] = {
            count: osInfo.count,
            supported: osInfo.supported,
            supportTier: osInfo.supportTier as
              | OSDistributionEntry["supportTier"]
              | undefined,
            upgradeRecommendation: osInfo.upgradeRecommendation || "",
          };
          return acc;
        },
        {} as Record<string, OSDistributionEntry>,
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
        {} as Record<string, OSDistributionEntry>,
      );

  const infrastructureSummary = useMemo(
    () =>
      buildInfrastructureSummary({
        infra,
        vcenterVersion,
        vcenterId,
        clusters,
      }),
    [infra, vcenterVersion, vcenterId, clusters],
  );

  const clusterRows = useMemo(
    () => buildClusterDetailRows(clusters),
    [clusters],
  );

  const clusterDetails = useMemo(() => {
    if (isAggregateView || !clusters) {
      return undefined;
    }
    return buildClusterDetails(Object.values(clusters)[0]);
  }, [clusters, isAggregateView]);

  if (!clusterFound && !isAggregateView) {
    return (
      <AppEmptyState
        titleText="No data is available for the selected cluster"
        body="Select a different cluster or check that inventory data has been collected."
        icon={InboxIcon}
        bullseyeStyle={{ minHeight: "240px" }}
      />
    );
  }

  return (
    <Grid hasGutter>
      <GridItem>
        <InfrastructureSummary summary={infrastructureSummary} />
      </GridItem>

      <GridItem>
        <VCenterClusterDetails
          isAggregateView={isAggregateView}
          rows={clusterRows}
          details={clusterDetails}
        />
      </GridItem>

      <GridItem>
        <Gallery hasGutter minWidths={{ default: "40%" }}>
          <GalleryItem>
            <HostPowerStates hostPowerStates={infra.hostPowerStates} />
          </GalleryItem>
          <GalleryItem>
            <VmPowerStates powerStates={vms.powerStates} />
          </GalleryItem>
        </Gallery>
      </GridItem>

      <GridItem>
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
              issuesBreakdown={vms.issuesBreakdown}
              onNavigateToVMFilters={onNavigateToVMFilters}
            />
          </GalleryItem>
          <GalleryItem>
            <OSDistribution osData={osData} />
          </GalleryItem>
        </Gallery>
      </GridItem>

      <GridItem>
        <Gallery hasGutter minWidths={{ default: "40%" }}>
          <GalleryItem>
            <CpuAndMemoryOverview
              cpuTierDistribution={vms.distributionByCpuTier}
              memoryTierDistribution={vms.distributionByMemoryTier}
              memoryTotalGB={ramGB?.total}
              cpuTotalCores={cpuCores?.total}
              onNavigateToVMFilters={onNavigateToVMFilters}
            />
          </GalleryItem>
          <GalleryItem>
            <StorageOverview
              diskSizeTier={vms.diskSizeTier ?? {}}
              diskTypes={vms.diskTypes ?? {}}
              totalVMs={vms.total ?? 0}
              totalWithSharedDisks={vms.totalWithSharedDisks ?? 0}
              onNavigateToVMFilters={onNavigateToVMFilters}
            />
          </GalleryItem>
        </Gallery>
      </GridItem>

      {isAggregateView ? (
        <GridItem>
          <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
            <GalleryItem>
              <ClustersOverview
                clustersPerDatacenter={infra.clustersPerDatacenter ?? []}
                clusters={clusters}
              />
            </GalleryItem>
            <GalleryItem>
              <HostsOverview hosts={infra.hosts} />
            </GalleryItem>
          </Gallery>
        </GridItem>
      ) : (
        <GridItem>
          <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
            <GalleryItem>
              <HostsOverview hosts={infra.hosts} />
            </GalleryItem>
            <GalleryItem>
              <NetworkOverview
                infra={infra}
                nicCount={vms.nicCount}
                distributionByNicCount={vms.distributionByNicCount}
              />
            </GalleryItem>
          </Gallery>
        </GridItem>
      )}
      {isAggregateView && (
        <GridItem>
          <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
            <GalleryItem>
              <NetworkOverview
                infra={infra}
                nicCount={vms.nicCount}
                distributionByNicCount={vms.distributionByNicCount}
              />
            </GalleryItem>
          </Gallery>
        </GridItem>
      )}

      <GridItem>
        <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
          <GalleryItem>
            <WarningsTable
              warnings={vms.migrationWarnings || []}
              onConcernClick={onConcernClick}
            />
          </GalleryItem>
          <GalleryItem>
            <ErrorTable
              errors={vms.notMigratableReasons || []}
              onConcernClick={onConcernClick}
            />
          </GalleryItem>
        </Gallery>
      </GridItem>
    </Grid>
  );
};

Dashboard.displayName = "Dashboard";

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
  VCenterClusterDetails,
  VmPowerStates,
} from "@openshift-migration-advisor/shared-components";
import { Gallery, GalleryItem, Grid, GridItem } from "@patternfly/react-core";
import { InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo } from "react";
import { AppEmptyState } from "../../../../common/components";
import {
  ChartDownloadButton,
  useChartDownload,
} from "../Export/ChartDownloadButton";
import type { NavigateToVMFilters } from "../VirtualMachinesTab/vmNavigation";
import { ClustersOverview } from "./ClustersOverview";
import { CpuAndMemoryOverview } from "./CpuAndMemoryOverview";
import { ErrorTable } from "./ErrorTable";
import { HostsOverview } from "./HostsOverview";
import { NetworkOverview } from "./NetworkOverview";
import { buildOsDistributionData } from "./osDistributionData";
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
  isExportMode,
  clusters,
  vcenterVersion,
  vcenterId,
  isAggregateView = true,
  clusterFound = true,
  onConcernClick,
  onNavigateToVMFilters,
}) => {
  const chartDownload = useChartDownload();
  const osData = useMemo(() => buildOsDistributionData(vms), [vms]);

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

  const pngButton = (
    chartId: string,
    title: string,
    getNode: () => React.ReactNode,
  ) =>
    !isExportMode && chartDownload ? (
      <ChartDownloadButton chartId={chartId} title={title} getNode={getNode} />
    ) : undefined;

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
      <GridItem data-export-block={isExportMode ? "1" : undefined}>
        <InfrastructureSummary
          summary={infrastructureSummary}
          headerActions={pngButton(
            "infrastructure-summary",
            "Infrastructure summary",
            () => <InfrastructureSummary summary={infrastructureSummary} />,
          )}
        />
      </GridItem>

      <GridItem data-export-block={isExportMode ? "1a" : undefined}>
        <VCenterClusterDetails
          isAggregateView={isAggregateView}
          rows={clusterRows}
          details={clusterDetails}
          isExportMode={isExportMode}
          headerActions={pngButton(
            "vcenter-cluster-details",
            "vCenter cluster details",
            () => (
              <VCenterClusterDetails
                isAggregateView={isAggregateView}
                rows={clusterRows}
                details={clusterDetails}
                isExportMode
              />
            ),
          )}
        />
      </GridItem>

      <GridItem data-export-block={isExportMode ? "1b" : undefined}>
        <Gallery hasGutter minWidths={{ default: "40%" }}>
          <GalleryItem>
            <HostPowerStates
              hostPowerStates={infra.hostPowerStates}
              isExportMode={isExportMode}
              headerActions={pngButton(
                "host-power-states",
                "ESXi host power states",
                () => (
                  <HostPowerStates
                    hostPowerStates={infra.hostPowerStates}
                    isExportMode
                  />
                ),
              )}
            />
          </GalleryItem>
          <GalleryItem>
            <VmPowerStates
              powerStates={vms.powerStates}
              isExportMode={isExportMode}
              headerActions={pngButton(
                "vm-power-states",
                "VM power states",
                () => (
                  <VmPowerStates powerStates={vms.powerStates} isExportMode />
                ),
              )}
            />
          </GalleryItem>
        </Gallery>
      </GridItem>

      <GridItem data-export-block={isExportMode ? "2" : undefined}>
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
              isExportMode={isExportMode}
              onNavigateToVMFilters={onNavigateToVMFilters}
            />
          </GalleryItem>
          <GalleryItem>
            <OSDistribution
              osData={osData}
              isExportMode={isExportMode}
              headerActions={pngButton(
                "os-distribution",
                "Operating system distribution",
                () => <OSDistribution osData={osData} isExportMode />,
              )}
            />
          </GalleryItem>
        </Gallery>
      </GridItem>

      <GridItem data-export-block={isExportMode ? "3" : undefined}>
        <Gallery hasGutter minWidths={{ default: "40%" }}>
          <GalleryItem>
            <CpuAndMemoryOverview
              isExportMode={isExportMode}
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
              isExportMode={isExportMode}
              exportAllViews={isExportMode}
              onNavigateToVMFilters={onNavigateToVMFilters}
            />
          </GalleryItem>
        </Gallery>
      </GridItem>

      {isAggregateView ? (
        <GridItem data-export-block={isExportMode ? "4" : undefined}>
          <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
            <GalleryItem>
              <ClustersOverview
                clustersPerDatacenter={infra.clustersPerDatacenter ?? []}
                isExportMode={isExportMode}
                clusters={clusters}
              />
            </GalleryItem>
            <GalleryItem>
              <HostsOverview hosts={infra.hosts} isExportMode={isExportMode} />
            </GalleryItem>
          </Gallery>
        </GridItem>
      ) : (
        <GridItem data-export-block={isExportMode ? "4" : undefined}>
          <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
            <GalleryItem>
              <HostsOverview hosts={infra.hosts} isExportMode={isExportMode} />
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
        <GridItem data-export-block={isExportMode ? "4a" : undefined}>
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

      <GridItem data-export-block={isExportMode ? "5" : undefined}>
        <Gallery hasGutter minWidths={{ default: "300px", md: "45%" }}>
          <GalleryItem>
            <WarningsTable
              warnings={vms.migrationWarnings || []}
              isExportMode={isExportMode}
              onConcernClick={onConcernClick}
            />
          </GalleryItem>
          <GalleryItem>
            <ErrorTable
              errors={vms.notMigratableReasons || []}
              isExportMode={isExportMode}
              onConcernClick={onConcernClick}
            />
          </GalleryItem>
        </Gallery>
      </GridItem>
    </Grid>
  );
};

Dashboard.displayName = "Dashboard";

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
import type { ReactNode } from "react";
import { ClustersOverview } from "../Dashboard/ClustersOverview";
import { CpuAndMemoryOverview } from "../Dashboard/CpuAndMemoryOverview";
import { ErrorTable } from "../Dashboard/ErrorTable";
import { HostsOverview } from "../Dashboard/HostsOverview";
import { NetworkOverview } from "../Dashboard/NetworkOverview";
import { buildOsDistributionData } from "../Dashboard/osDistributionData";
import {
  StorageOverview,
  type StorageViewMode,
} from "../Dashboard/StorageOverview";
import { VMMigrationStatus } from "../Dashboard/VMMigrationStatus";
import { WarningsTable } from "../Dashboard/WarningsTable";
import type { ExportChartSpec } from "./captureExportCharts";
import { chartFilename } from "./chartExportCapture";

export interface ExportChartSpecsInput {
  infra: Infra;
  cpuCores?: VMResourceBreakdown;
  ramGB?: VMResourceBreakdown;
  vms: VMs;
  clusters?: { [key: string]: InventoryData };
  vcenterVersion?: string;
  vcenterId?: string;
  isAggregateView?: boolean;
}

type ChartDraft = {
  id: string;
  title: string;
  node: ReactNode;
};

function storageChart(
  id: string,
  title: string,
  viewMode: StorageViewMode,
  vms: VMs,
): ChartDraft {
  return {
    id,
    title,
    node: (
      <StorageOverview
        diskSizeTier={vms.diskSizeTier ?? {}}
        diskTypes={vms.diskTypes ?? {}}
        totalVMs={vms.total ?? 0}
        totalWithSharedDisks={vms.totalWithSharedDisks ?? 0}
        isExportMode
        viewMode={viewMode}
      />
    ),
  };
}

export function buildExportChartSpecs({
  infra,
  cpuCores,
  ramGB,
  vms,
  clusters,
  vcenterVersion,
  vcenterId,
  isAggregateView = true,
}: ExportChartSpecsInput): ExportChartSpec[] {
  const osData = buildOsDistributionData(vms);
  const infrastructureSummary = buildInfrastructureSummary({
    infra,
    vcenterVersion,
    vcenterId,
    clusters,
  });
  const clusterRows = buildClusterDetailRows(clusters);
  const clusterDetails =
    isAggregateView || !clusters
      ? undefined
      : buildClusterDetails(Object.values(clusters)[0]);
  const migrationData = {
    migratable: vms.totalMigratable || 0,
    nonMigratable: Math.max(0, (vms.total || 0) - (vms.totalMigratable || 0)),
  };

  const drafts: ChartDraft[] = [
    {
      id: "infrastructure-summary",
      title: "Infrastructure summary",
      node: <InfrastructureSummary summary={infrastructureSummary} />,
    },
    {
      id: "vcenter-cluster-details",
      title: "vCenter cluster details",
      node: (
        <VCenterClusterDetails
          isAggregateView={isAggregateView}
          rows={clusterRows}
          details={clusterDetails}
          isExportMode
        />
      ),
    },
    {
      id: "host-power-states",
      title: "Host power states",
      node: (
        <HostPowerStates hostPowerStates={infra.hostPowerStates} isExportMode />
      ),
    },
    {
      id: "vm-power-states",
      title: "VM power states",
      node: <VmPowerStates powerStates={vms.powerStates} isExportMode />,
    },
    {
      id: "vm-migration-issues-vs-no-issues",
      title: "VM migration status — No issues vs with issues",
      node: (
        <VMMigrationStatus
          data={migrationData}
          issuesBreakdown={vms.issuesBreakdown}
          isExportMode
          viewMode="issuesVsNoIssues"
        />
      ),
    },
    {
      id: "vm-migration-issues-breakdown",
      title: "VM migration status — With issues breakdown",
      node: (
        <VMMigrationStatus
          data={migrationData}
          issuesBreakdown={vms.issuesBreakdown}
          isExportMode
          viewMode="issuesBreakdown"
        />
      ),
    },
    {
      id: "os-distribution",
      title: "Operating system distribution",
      node: <OSDistribution osData={osData} isExportMode />,
    },
    {
      id: "cpu-memory-memory-tiers",
      title: "CPU & memory — Memory size tiers",
      node: (
        <CpuAndMemoryOverview
          isExportMode
          viewMode="memoryTiers"
          cpuTierDistribution={vms.distributionByCpuTier}
          memoryTierDistribution={vms.distributionByMemoryTier}
          memoryTotalGB={ramGB?.total}
          cpuTotalCores={cpuCores?.total}
        />
      ),
    },
    {
      id: "cpu-memory-vcpu-tiers",
      title: "CPU & memory — vCPU count tiers",
      node: (
        <CpuAndMemoryOverview
          isExportMode
          viewMode="vcpuTiers"
          cpuTierDistribution={vms.distributionByCpuTier}
          memoryTierDistribution={vms.distributionByMemoryTier}
          memoryTotalGB={ramGB?.total}
          cpuTotalCores={cpuCores?.total}
        />
      ),
    },
    storageChart(
      "storage-total-size",
      "Storage — Total disk size by tier",
      "totalSize",
      vms,
    ),
    storageChart(
      "storage-vm-count",
      "Storage — VM count by disk size tier",
      "vmCount",
      vms,
    ),
    storageChart(
      "storage-vm-count-by-disk-type",
      "Storage — VM count by disk type",
      "vmCountByDiskType",
      vms,
    ),
    storageChart(
      "storage-shared-disks",
      "Storage — Shared disks VS. No shared disks",
      "sharedDisks",
      vms,
    ),
  ];

  if (isAggregateView) {
    drafts.push(
      {
        id: "clusters-data-center-distribution",
        title: "Clusters — Cluster distribution by data center",
        node: (
          <ClustersOverview
            clustersPerDatacenter={infra.clustersPerDatacenter ?? []}
            isExportMode
            viewMode="dataCenterDistribution"
            clusters={clusters}
          />
        ),
      },
      {
        id: "clusters-vm-by-cluster",
        title: "Clusters — VM distribution by cluster",
        node: (
          <ClustersOverview
            clustersPerDatacenter={infra.clustersPerDatacenter ?? []}
            isExportMode
            viewMode="vmByCluster"
            clusters={clusters}
          />
        ),
      },
      {
        id: "clusters-cpu-over-commitment",
        title: "Clusters — Cluster CPU over commitment",
        node: (
          <ClustersOverview
            clustersPerDatacenter={infra.clustersPerDatacenter ?? []}
            isExportMode
            viewMode="cpuOverCommitment"
            clusters={clusters}
          />
        ),
      },
    );
  }

  drafts.push(
    {
      id: "hosts-by-model",
      title: "Host distribution by model",
      node: <HostsOverview hosts={infra.hosts} isExportMode />,
    },
    {
      id: "networks-distribution",
      title: "Networks — VM distribution by network",
      node: (
        <NetworkOverview
          infra={infra}
          nicCount={vms.nicCount}
          distributionByNicCount={vms.distributionByNicCount}
          isExportMode
          viewMode="networkDistribution"
        />
      ),
    },
    {
      id: "networks-nic-count",
      title: "Networks — VM distribution by NIC count",
      node: (
        <NetworkOverview
          infra={infra}
          nicCount={vms.nicCount}
          distributionByNicCount={vms.distributionByNicCount}
          isExportMode
          viewMode="nicCount"
        />
      ),
    },
    {
      id: "warnings",
      title: "Warnings",
      node: (
        <WarningsTable warnings={vms.migrationWarnings || []} isExportMode />
      ),
    },
    {
      id: "errors",
      title: "Errors",
      node: <ErrorTable errors={vms.notMigratableReasons || []} isExportMode />,
    },
  );

  return drafts.map((draft, index) => ({
    ...draft,
    filename: chartFilename(index, draft.title),
  }));
}

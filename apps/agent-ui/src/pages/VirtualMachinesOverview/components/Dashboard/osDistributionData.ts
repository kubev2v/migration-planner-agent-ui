import type { VMs } from "@openshift-migration-advisor/agent-sdk";
import type { OSDistributionEntry } from "@openshift-migration-advisor/shared-components";

export function buildOsDistributionData(
  vms: VMs,
): Record<string, OSDistributionEntry> {
  if (vms.osInfo) {
    return Object.entries(vms.osInfo).reduce(
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
    );
  }

  return Object.entries(vms.os || {}).reduce(
    (acc, [osName, count]) => {
      acc[osName] = {
        count,
        supported: true,
        upgradeRecommendation: "",
      };
      return acc;
    },
    {} as Record<string, OSDistributionEntry>,
  );
}

import type { ApplianceOverview } from "./appliancesApi";
import type { ApplicationOverview } from "./applicationsApi";

/** Map an appliance list entry to the shape expected by `ApplicationVmsDrawer`. */
export function applianceToDrawerApplication(
  appliance: ApplianceOverview,
): ApplicationOverview {
  return {
    name: appliance.name,
    description: appliance.version,
    vendor: appliance.vendor,
    confidence: appliance.confidence,
    vmCount: appliance.vmCount,
    vms: appliance.vms,
  };
}

import type { ApplicationOverview } from "./applicationsApi";
import { getApplicationVendor } from "./applicationVendor";

export function getApplicationVendorDisplay(
  application: Pick<ApplicationOverview, "name" | "vendor">,
): string {
  const vendor = application.vendor?.trim();
  if (vendor) {
    return vendor;
  }
  return getApplicationVendor(application.name);
}

export function getApplicationConfidenceDisplay(
  application: Pick<ApplicationOverview, "confidence">,
): string {
  if (application.confidence === undefined || application.confidence === null) {
    return "—";
  }
  return `${application.confidence}%`;
}

export function getApplianceVersionDisplay(
  version: string | undefined,
): string {
  const trimmed = version?.trim();
  return trimmed ? trimmed : "—";
}

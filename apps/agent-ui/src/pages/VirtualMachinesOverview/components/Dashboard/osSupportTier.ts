import {
  OsInfoSupportTierEnum,
  type OsInfoSupportTierEnum as SupportTier,
} from "@openshift-migration-advisor/agent-sdk";
import type { LabelProps } from "@patternfly/react-core";
import { t_color_blue_20 } from "@patternfly/react-tokens/dist/esm/t_color_blue_20";
import { t_color_blue_60 } from "@patternfly/react-tokens/dist/esm/t_color_blue_60";
import { t_color_green_20 } from "@patternfly/react-tokens/dist/esm/t_color_green_20";
import { t_color_green_60 } from "@patternfly/react-tokens/dist/esm/t_color_green_60";
import { t_color_orange_20 } from "@patternfly/react-tokens/dist/esm/t_color_orange_20";
import { t_color_orange_60 } from "@patternfly/react-tokens/dist/esm/t_color_orange_60";
import { t_color_yellow_20 } from "@patternfly/react-tokens/dist/esm/t_color_yellow_20";
import { t_color_yellow_60 } from "@patternfly/react-tokens/dist/esm/t_color_yellow_60";

export const SUPPORT_TIER_LEARN_MORE_URL =
  "https://access.redhat.com/articles/4234591";

export interface OSDistributionEntry {
  count: number;
  supported: boolean;
  supportTier?: SupportTier;
  upgradeRecommendation: string;
}

const SUPPORT_TIER_SORT_ORDER: Record<SupportTier, number> = {
  [OsInfoSupportTierEnum.Certified]: 1,
  [OsInfoSupportTierEnum.VendorSupported]: 2,
  [OsInfoSupportTierEnum.CommunitySupported]: 3,
  [OsInfoSupportTierEnum.SpecialHandling]: 4,
};

export const SUPPORT_TIER_LABELS: Record<SupportTier, string> = {
  [OsInfoSupportTierEnum.Certified]: "Certified",
  [OsInfoSupportTierEnum.VendorSupported]: "Commercial Vendor Supported",
  [OsInfoSupportTierEnum.CommunitySupported]: "Community supported",
  [OsInfoSupportTierEnum.SpecialHandling]: "Special handling",
};

/** Official tier definitions from Red Hat KCS 4234591. */
export const SUPPORT_TIER_DEFINITIONS: Record<SupportTier, string> = {
  [OsInfoSupportTierEnum.Certified]:
    "Red Hat has tested, certified and will support this combination of hypervisor and guest operating system. Customers with valid subscriptions may contact Red Hat for support. Red Hat will work with the vendor if the guest operating system issue is related to a hypervisor issue.",
  [OsInfoSupportTierEnum.VendorSupported]:
    "Red Hat will provide hypervisor support for this combination of certified hypervisor and commercial vendor supported guest operating system. Contact Red Hat for hypervisor support and your vendor for guest operating system support.",
  [OsInfoSupportTierEnum.CommunitySupported]:
    "Red Hat will provide hypervisor support for this combination of hypervisor and guest operating system. Contact Red Hat for hypervisor support and use available community channels for guest operating system support.",
  [OsInfoSupportTierEnum.SpecialHandling]:
    'Red Hat will provide hypervisor support for this combination ("Known to work" in the certified guest OS article), or the guest OS is not listed and support follows Red Hat\'s third-party software support policy. Review vendor and end-of-life policies before migrating.',
};

export const ORDERED_SUPPORT_TIERS: SupportTier[] = [
  OsInfoSupportTierEnum.Certified,
  OsInfoSupportTierEnum.VendorSupported,
  OsInfoSupportTierEnum.CommunitySupported,
  OsInfoSupportTierEnum.SpecialHandling,
];

export const SUPPORT_TIER_BADGE_COLORS: Record<
  SupportTier,
  NonNullable<LabelProps["color"]>
> = {
  [OsInfoSupportTierEnum.Certified]: "blue",
  [OsInfoSupportTierEnum.VendorSupported]: "green",
  [OsInfoSupportTierEnum.CommunitySupported]: "orange",
  [OsInfoSupportTierEnum.SpecialHandling]: "yellow",
};

export interface SupportTierBadgeStyle {
  backgroundColor: string;
  color: string;
}

/** Explicit colors for html2canvas PDF export (CSS variables are not captured reliably). */
export const SUPPORT_TIER_BADGE_INLINE_STYLES: Record<
  SupportTier,
  SupportTierBadgeStyle
> = {
  [OsInfoSupportTierEnum.Certified]: {
    backgroundColor: t_color_blue_20.value,
    color: t_color_blue_60.value,
  },
  [OsInfoSupportTierEnum.VendorSupported]: {
    backgroundColor: t_color_green_20.value,
    color: t_color_green_60.value,
  },
  [OsInfoSupportTierEnum.CommunitySupported]: {
    backgroundColor: t_color_orange_20.value,
    color: t_color_orange_60.value,
  },
  [OsInfoSupportTierEnum.SpecialHandling]: {
    backgroundColor: t_color_yellow_20.value,
    color: t_color_yellow_60.value,
  },
};

/**
 * Resolves the effective support tier for an OS entry.
 * Falls back to the legacy `supported` boolean when the API omits `supportTier`.
 */
export function resolveSupportTier(
  supportTier: SupportTier | undefined,
  supported: boolean,
): SupportTier {
  if (supportTier) {
    return supportTier;
  }

  return supported
    ? OsInfoSupportTierEnum.Certified
    : OsInfoSupportTierEnum.SpecialHandling;
}

export function getSupportTierSortOrder(tier: SupportTier): number {
  return SUPPORT_TIER_SORT_ORDER[tier];
}

export function getSupportTierLegendLabel(tier: SupportTier): string {
  return SUPPORT_TIER_LABELS[tier];
}

export function getSupportTierDefinition(tier: SupportTier): string {
  return SUPPORT_TIER_DEFINITIONS[tier];
}

export function getSupportTierBadgeColor(
  tier: SupportTier,
): NonNullable<LabelProps["color"]> {
  return SUPPORT_TIER_BADGE_COLORS[tier];
}

export function getSupportTierBadgeInlineStyle(
  tier: SupportTier,
): SupportTierBadgeStyle {
  return SUPPORT_TIER_BADGE_INLINE_STYLES[tier];
}

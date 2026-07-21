import { OsInfoSupportTierEnum } from "@openshift-migration-advisor/agent-sdk";
import { describe, expect, it } from "vitest";

import {
  getSupportTierBadgeInlineStyle,
  getSupportTierDefinition,
  getSupportTierLegendLabel,
  getSupportTierSortOrder,
  hasOsUpgradeNotice,
  resolveSupportTier,
  SUPPORT_TIER_DEFINITIONS,
} from "../osSupportTier";

describe("osSupportTier", () => {
  it("maps API tier values to display labels", () => {
    expect(getSupportTierLegendLabel(OsInfoSupportTierEnum.Certified)).toBe(
      "Certified",
    );
    expect(
      getSupportTierLegendLabel(OsInfoSupportTierEnum.VendorSupported),
    ).toBe("Commercial Vendor Supported");
    expect(
      getSupportTierLegendLabel(OsInfoSupportTierEnum.CommunitySupported),
    ).toBe("Community supported");
    expect(
      getSupportTierLegendLabel(OsInfoSupportTierEnum.SpecialHandling),
    ).toBe("Special handling");
  });

  it("orders tiers from best to worst support", () => {
    expect(
      getSupportTierSortOrder(OsInfoSupportTierEnum.Certified),
    ).toBeLessThan(
      getSupportTierSortOrder(OsInfoSupportTierEnum.VendorSupported),
    );
    expect(
      getSupportTierSortOrder(OsInfoSupportTierEnum.VendorSupported),
    ).toBeLessThan(
      getSupportTierSortOrder(OsInfoSupportTierEnum.CommunitySupported),
    );
    expect(
      getSupportTierSortOrder(OsInfoSupportTierEnum.CommunitySupported),
    ).toBeLessThan(
      getSupportTierSortOrder(OsInfoSupportTierEnum.SpecialHandling),
    );
  });

  it("uses supportTier when present", () => {
    expect(
      resolveSupportTier(OsInfoSupportTierEnum.CommunitySupported, true),
    ).toBe(OsInfoSupportTierEnum.CommunitySupported);
  });

  it("falls back to certified when supportTier is missing and supported is true", () => {
    expect(resolveSupportTier(undefined, true)).toBe(
      OsInfoSupportTierEnum.Certified,
    );
  });

  it("falls back to special handling when supportTier is missing and supported is false", () => {
    expect(resolveSupportTier(undefined, false)).toBe(
      OsInfoSupportTierEnum.SpecialHandling,
    );
  });

  it("provides official Red Hat definitions for each support tier", () => {
    expect(getSupportTierDefinition(OsInfoSupportTierEnum.Certified)).toBe(
      SUPPORT_TIER_DEFINITIONS[OsInfoSupportTierEnum.Certified],
    );
    expect(
      getSupportTierDefinition(OsInfoSupportTierEnum.VendorSupported),
    ).toContain("commercial vendor supported guest operating system");
    expect(
      getSupportTierDefinition(OsInfoSupportTierEnum.CommunitySupported),
    ).toContain("community channels");
    expect(
      getSupportTierDefinition(OsInfoSupportTierEnum.SpecialHandling),
    ).toContain("third-party software support policy");
  });

  it("provides explicit inline badge colors for PDF export", () => {
    expect(
      getSupportTierBadgeInlineStyle(OsInfoSupportTierEnum.Certified),
    ).toEqual({
      backgroundColor: "#b9dafc",
      color: "#004d99",
    });
  });

  it("detects when the upgrade notice should be shown", () => {
    expect(
      hasOsUpgradeNotice({
        "Red Hat Enterprise Linux 9 (64-bit)": {
          count: 1,
          supported: true,
          supportTier: OsInfoSupportTierEnum.Certified,
          upgradeRecommendation: "",
        },
      }),
    ).toBe(false);

    expect(
      hasOsUpgradeNotice({
        "CentOS 7 (64-bit)": {
          count: 1,
          supported: false,
          supportTier: OsInfoSupportTierEnum.SpecialHandling,
          upgradeRecommendation: "",
        },
      }),
    ).toBe(true);
  });
});

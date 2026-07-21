import "@testing-library/jest-dom";

import { OsInfoSupportTierEnum } from "@openshift-migration-advisor/agent-sdk";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { OSBarChart, OSDistribution } from "../OSDistribution";
import { SUPPORT_TIER_DEFINITIONS } from "../osSupportTier";

const sampleOsData = {
  "Red Hat Enterprise Linux 9 (64-bit)": {
    count: 5,
    supported: true,
    supportTier: OsInfoSupportTierEnum.Certified,
    upgradeRecommendation: "",
  },
  "Ubuntu Linux 22.04 (64-bit)": {
    count: 3,
    supported: true,
    supportTier: OsInfoSupportTierEnum.VendorSupported,
    upgradeRecommendation: "",
  },
  "CentOS 7 (64-bit)": {
    count: 2,
    supported: false,
    supportTier: OsInfoSupportTierEnum.SpecialHandling,
    upgradeRecommendation: "Upgrade to RHEL 7",
  },
};

describe("OSBarChart", () => {
  it("renders operating systems in a table sorted by support tier", () => {
    render(<OSBarChart osData={sampleOsData} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Red Hat Enterprise Linux 9 (64-bit)");
    expect(rows[0]).toHaveTextContent("Certified");
    expect(rows[0]).toHaveTextContent("5");
    expect(rows[1]).toHaveTextContent("Ubuntu Linux 22.04 (64-bit)");
    expect(rows[2]).toHaveTextContent("CentOS 7 (64-bit)");
    expect(rows[2]).toHaveTextContent("Special handling");
  });

  it("sorts by tier before VM count", () => {
    render(
      <OSBarChart
        osData={{
          "CentOS 7 (64-bit)": {
            count: 100,
            supported: false,
            supportTier: OsInfoSupportTierEnum.SpecialHandling,
            upgradeRecommendation: "",
          },
          "Red Hat Enterprise Linux 9 (64-bit)": {
            count: 1,
            supported: true,
            supportTier: OsInfoSupportTierEnum.Certified,
            upgradeRecommendation: "",
          },
        }}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Red Hat Enterprise Linux 9 (64-bit)");
    expect(rows[1]).toHaveTextContent("CentOS 7 (64-bit)");
  });

  it("shows upgrade recommendation details next to the operating system", async () => {
    const user = userEvent.setup();

    render(<OSBarChart osData={sampleOsData} />);

    const upgradeButton = screen.getByRole("button", {
      name: "Open operating system upgrade information",
    });
    await user.click(upgradeButton);

    const popover = await screen.findByRole("dialog");
    expect(
      within(popover).getByText("Upgrade to get support"),
    ).toBeInTheDocument();
    expect(within(popover).getByText("Upgrade to RHEL 7")).toBeInTheDocument();
  });

  it("does not show upgrade recommendation icon in export mode", () => {
    render(<OSBarChart osData={sampleOsData} isExportMode />);

    expect(
      screen.queryByRole("button", {
        name: "Open operating system upgrade information",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows official Red Hat definitions in tier badge tooltips", async () => {
    const user = userEvent.setup();

    render(<OSBarChart osData={sampleOsData} />);

    const certifiedBadge = screen.getByText("Certified");
    await user.hover(certifiedBadge);

    expect(
      await screen.findByText(
        SUPPORT_TIER_DEFINITIONS[OsInfoSupportTierEnum.Certified],
      ),
    ).toBeInTheDocument();
  });

  it("filters operating systems by name", async () => {
    const user = userEvent.setup();

    render(<OSBarChart osData={sampleOsData} />);

    await user.type(screen.getByPlaceholderText("Filter by OS"), "Ubuntu");

    expect(screen.getByText("Ubuntu Linux 22.04 (64-bit)")).toBeInTheDocument();
    expect(
      screen.queryByText("Red Hat Enterprise Linux 9 (64-bit)"),
    ).not.toBeInTheDocument();
  });

  it("filters operating systems by support tier", async () => {
    const user = userEvent.setup();

    render(<OSBarChart osData={sampleOsData} />);

    await user.click(screen.getByRole("button", { name: /filter by tier/i }));
    await user.click(screen.getByRole("option", { name: "Special handling" }));

    expect(screen.getByText("CentOS 7 (64-bit)")).toBeInTheDocument();
    expect(
      screen.queryByText("Red Hat Enterprise Linux 9 (64-bit)"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when filters match no operating systems", async () => {
    const user = userEvent.setup();

    render(<OSBarChart osData={sampleOsData} />);

    await user.type(screen.getByPlaceholderText("Filter by OS"), "ccc");

    expect(
      screen.getByText("No matching operating system found"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "To continue, adjust your search or filters and try again",
      ),
    ).toBeInTheDocument();
  });

  it("renders export-friendly inline tier badge colors in export mode", () => {
    render(<OSBarChart osData={sampleOsData} isExportMode />);

    const certifiedBadge = screen.getByText("Certified");
    expect(certifiedBadge.tagName).toBe("SPAN");
    expect(certifiedBadge).toHaveStyle({
      backgroundColor: "rgb(185, 218, 252)",
      color: "rgb(0, 77, 153)",
    });
  });

  it("shows empty state when no operating systems are available", () => {
    render(<OSBarChart osData={{}} />);

    expect(
      screen.getByText("Operating system data not collected"),
    ).toBeInTheDocument();
  });
});

describe("OSDistribution", () => {
  it("shows the guest OS support tiers help popover", async () => {
    const user = userEvent.setup();

    render(<OSDistribution osData={sampleOsData} />);

    await user.click(
      screen.getByRole("button", { name: "Guest OS support tiers help" }),
    );

    const popover = await screen.findByRole("dialog");
    expect(
      within(popover).getByText("Guest OS support tiers"),
    ).toBeInTheDocument();
    expect(within(popover).getByText("Certified")).toBeInTheDocument();
    expect(
      within(popover).getByText("Commercial Vendor Supported"),
    ).toBeInTheDocument();
    expect(
      within(popover).getByRole("link", { name: /learn more/i }),
    ).toHaveAttribute("href", "https://access.redhat.com/articles/4234591");
  });

  it("shows the upgrade notice when non-certified operating systems are present", () => {
    render(
      <OSDistribution
        osData={{
          "CentOS 7 (64-bit)": {
            count: 2,
            supported: false,
            supportTier: OsInfoSupportTierEnum.SpecialHandling,
            upgradeRecommendation: "",
          },
        }}
      />,
    );

    expect(
      screen.getByText(
        "Some operating systems may need upgrades before migration",
      ),
    ).toBeInTheDocument();
  });

  it("does not show the upgrade notice when all operating systems are certified", () => {
    render(
      <OSDistribution
        osData={{
          "Red Hat Enterprise Linux 9 (64-bit)": {
            count: 5,
            supported: true,
            supportTier: OsInfoSupportTierEnum.Certified,
            upgradeRecommendation: "",
          },
        }}
      />,
    );

    expect(
      screen.queryByText(
        "Some operating systems may need upgrades before migration",
      ),
    ).not.toBeInTheDocument();
  });
});

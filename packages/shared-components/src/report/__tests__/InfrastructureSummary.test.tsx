import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfrastructureSummary } from "../InfrastructureSummary.js";
import { VCenterClusterDetails } from "../VCenterClusterDetails.js";

afterEach(() => cleanup());

describe("InfrastructureSummary", () => {
  it("renders inventory summary fields from the mapped model", () => {
    render(
      <InfrastructureSummary
        summary={{
          vmwareVersion: "vSphere 7.0.3",
          datacenters: 1,
          vCenters: 1,
          esxiHosts: 12,
        }}
      />,
    );

    expect(screen.getByText("Infrastructure summary")).toBeInTheDocument();
    expect(screen.getByText("vSphere 7.0.3")).toBeInTheDocument();
    expect(screen.getByText("Datacenters")).toBeInTheDocument();
    expect(screen.getByText("vCenters")).toBeInTheDocument();
    expect(screen.getByText("ESXi hosts")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});

describe("VCenterClusterDetails", () => {
  it("renders the aggregate cluster table with feature statuses", () => {
    render(
      <VCenterClusterDetails
        isAggregateView
        rows={[
          {
            id: "Cluster-Prod-01",
            name: "Cluster-Prod-01",
            hosts: 5,
            vms: 280,
            vmotion: "enabled",
            drs: "enabled",
            vsan: "enabled",
          },
          {
            id: "Cluster-Dev-02",
            name: "Cluster-Dev-02",
            hosts: 7,
            vms: 350,
            vmotion: "enabled",
            drs: "disabled",
            vsan: "enabled",
          },
        ]}
      />,
    );

    expect(screen.getByText("vCenter cluster details")).toBeInTheDocument();
    expect(screen.getByText("Cluster-Prod-01")).toBeInTheDocument();
    expect(screen.getByText("Cluster-Dev-02")).toBeInTheDocument();
    expect(screen.getAllByText("Enabled").length).toBeGreaterThan(0);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("limits the aggregate table height so long cluster lists can scroll", () => {
    render(
      <VCenterClusterDetails
        isAggregateView
        rows={Array.from({ length: 12 }, (_, index) => ({
          id: `cluster-${index}`,
          name: `cluster-${index}`,
          hosts: index + 1,
          vms: (index + 1) * 10,
          vmotion: "unknown",
          drs: "unknown",
          vsan: "disabled",
        }))}
      />,
    );

    expect(
      screen.getByTestId("vcenter-cluster-details-table").parentElement,
    ).toHaveAttribute("data-scroll-constrained", "true");
  });

  it("renders the detailed cluster cards for a single cluster", () => {
    render(
      <VCenterClusterDetails
        isAggregateView={false}
        rows={[]}
        details={{
          hosts: 7,
          vms: 350,
          networksDetected: 2,
          vmotion: "enabled",
          drs: "disabled",
          ha: "enabled",
          vsan: "disabled",
          networks: [
            {
              name: "VDS-Dev",
              vlanId: "10",
              displayName: "VDS-Dev (VLAN 10)",
            },
            {
              name: "VDS-Dev",
              vlanId: "11",
              displayName: "VDS-Dev (VLAN 11)",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Core infrastructure")).toBeInTheDocument();
    expect(screen.getByText("vSAN capabilities")).toBeInTheDocument();
    expect(screen.getByText("Network topology")).toBeInTheDocument();
    expect(screen.getByText("vMotion")).toBeInTheDocument();
    expect(screen.getByText("DRS")).toBeInTheDocument();
    expect(screen.getByText("HA")).toBeInTheDocument();
    expect(screen.getByText("VDS-Dev (VLAN 10)")).toBeInTheDocument();
    expect(screen.getByText("VDS-Dev (VLAN 11)")).toBeInTheDocument();
    expect(screen.queryByText("VM encryption")).toBeNull();
  });
});

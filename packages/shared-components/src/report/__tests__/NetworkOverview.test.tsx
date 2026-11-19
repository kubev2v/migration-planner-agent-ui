import "@testing-library/jest-dom";
import {
  chart_color_black_500,
  chart_color_blue_300,
  chart_color_green_300,
  chart_color_orange_100,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_red_orange_200,
  chart_color_teal_200,
  chart_color_teal_400,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MigrationDonutChartProps } from "../../charts/MigrationDonutChart.js";
import { NetworkOverview } from "../NetworkOverview.js";

const donutProps = vi.hoisted(() => ({
  current: null as MigrationDonutChartProps | null,
}));

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: (props: MigrationDonutChartProps): JSX.Element => {
    donutProps.current = props;
    return (
      <div data-testid="network-donut">
        {props.title} {props.subTitle}
      </div>
    );
  },
}));

afterEach(() => {
  donutProps.current = null;
  cleanup();
});

const renderedDonut = (): MigrationDonutChartProps => {
  const props = donutProps.current;
  if (!props) {
    throw new Error("expected a network donut to render");
  }
  return props;
};

const NETWORK_CARD_SUBTITLE =
  "Top 5 networks - a VM can be on multiple networks";

describe("NetworkOverview", () => {
  it("shows the network empty state when no networks were collected", () => {
    render(<NetworkOverview />);

    expect(screen.getByText("Networks")).toBeInTheDocument();
    expect(screen.getByText(NETWORK_CARD_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText("Network data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("network-donut")).not.toBeInTheDocument();
  });

  it("keeps the top 4 networks and rolls the rest into one slice", () => {
    render(
      <NetworkOverview
        infra={{
          networks: [
            { vmsCount: 10, vlanId: "100" },
            { vmsCount: 8, vlanId: 200 },
            { vmsCount: 6, vlanId: "   " },
            { vmsCount: 4 },
            { vmsCount: 3, vlanId: "9" },
            { vmsCount: 1, vlanId: "8" },
            { vmsCount: Number.NaN },
          ],
        }}
      />,
    );

    const props = renderedDonut();
    expect(props.title).toBe("32");
    expect(props.subTitle).toBe("unique VMs");
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["Network 1", 10],
      ["Network 2", 8],
      ["Network 3", 6],
      ["Network 4", 4],
      ["Rest of networks", 4],
    ]);
    expect(props.data.map((slice) => slice.countDisplay)).toEqual([
      "10 VMs connected",
      "8 VMs connected",
      "6 VMs connected",
      "4 VMs connected",
      "4 VMs connected",
    ]);
    expect(props.legend).toEqual({
      "Network 1": chart_color_blue_300.value,
      "Network 2": chart_color_purple_300.value,
      "Network 3": chart_color_purple_100.value,
      "Network 4": chart_color_teal_200.value,
      "Rest of networks": chart_color_yellow_400.value,
    });
    expect(props.legendVariant).toBe("html");
    expect(props.height).toBe(300);
    expect(props.width).toBe(420);
    expect(props.donutThickness).toBe(18);
    expect(props.titleFontSize).toBe(34);
    expect(props.labelFontSize).toBe(18);
    expect(props.itemsPerRow).toBe(3);
    expect(props.marginLeft).toBe("0%");
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "Network 1",
          y: 10,
          countDisplay: "10 VMs connected",
          legendCategory: "Network 1",
        },
        percent: 31.25,
        total: 32,
      }),
    ).toBe("10 VMs connected\n31.3%\nVLAN: 100");
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "Network 2",
          y: 8,
          countDisplay: "8 VMs connected",
          legendCategory: "Network 2",
        },
        percent: 25,
        total: 32,
      }),
    ).toBe("8 VMs connected\n25.0%\nVLAN: 200");
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "Rest of networks",
          y: 4,
          countDisplay: "4 VMs connected",
          legendCategory: "Rest of networks",
        },
        percent: 12.5,
        total: 32,
      }),
    ).toBe("4 VMs connected\n12.5%\nVLAN: -");
  });

  it("uses uniqueVmCount for the network donut center when provided", () => {
    render(
      <NetworkOverview
        uniqueVmCount={25}
        infra={{
          networks: [
            { vmsCount: 10, vlanId: "100" },
            { vmsCount: 8, vlanId: 200 },
            { vmsCount: 6 },
            { vmsCount: 4 },
            { vmsCount: 3 },
            { vmsCount: 1 },
          ],
        }}
      />,
    );

    const props = renderedDonut();
    expect(props.title).toBe("25");
    expect(props.subTitle).toBe("unique VMs");
    expect(screen.getByText(NETWORK_CARD_SUBTITLE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "VMs by network (may overlap)" }),
    ).toBeInTheDocument();
  });

  it("switches to NIC count and falls back to the histogram", async () => {
    const user = userEvent.setup();
    render(
      <NetworkOverview
        legendVariant="chart"
        nicCount={{
          total: 9,
          histogram: { minValue: 1, step: 1, data: [4, 0, 5] },
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "VMs by network (may overlap)" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "VM distribution by NIC count" }),
    );

    expect(screen.queryByText(NETWORK_CARD_SUBTITLE)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "VM distribution by NIC count" }),
    ).toBeInTheDocument();

    const props = renderedDonut();
    expect(props.legendVariant).toBe("chart");
    expect(props.title).toBe("9");
    expect(props.subTitle).toBe("VMs");
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["1 NIC", 4],
      ["3 NIC", 5],
    ]);
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "1 NIC",
          y: 4,
          countDisplay: "4 VMs",
          legendCategory: "1 NIC",
        },
        percent: 44.444,
        total: 9,
      }),
    ).toBe("4 VMs\n44.4%");
  });

  it("plots distributionByNicCount ahead of the deprecated histogram", async () => {
    const user = userEvent.setup();
    render(
      <NetworkOverview
        distributionByNicCount={{ "2": 5, "4+": 2, "1": 3, "0": 1 }}
        nicCount={{
          total: 99,
          histogram: { minValue: 1, step: 1, data: [9] },
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "VMs by network (may overlap)" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "VM distribution by NIC count" }),
    );

    const props = renderedDonut();
    expect(props.title).toBe("11");
    expect(props.data.map((slice) => slice.name)).toEqual([
      "0 NIC",
      "1 NIC",
      "2 NIC",
      "4+ NIC",
    ]);
    expect(props.legend).toEqual({
      "0 NIC": chart_color_blue_300.value,
      "1 NIC": chart_color_purple_300.value,
      "2 NIC": chart_color_purple_100.value,
      "4+ NIC": chart_color_teal_200.value,
    });
  });

  it("shows the NIC empty state when the selected distribution is empty", async () => {
    const user = userEvent.setup();
    render(<NetworkOverview distributionByNicCount={{}} />);

    await user.click(
      screen.getByRole("button", { name: "VMs by network (may overlap)" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "VM distribution by NIC count" }),
    );

    expect(
      screen.getByText("NIC count data not collected"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("network-donut")).not.toBeInTheDocument();
  });

  it("uses the extended palette when there are more NIC buckets than base colors", async () => {
    const user = userEvent.setup();
    render(
      <NetworkOverview
        distributionByNicCount={{
          "0": 1,
          "1": 1,
          "2": 1,
          "3": 1,
          "4": 1,
          "5": 1,
          "6": 1,
          "7": 1,
          "8": 1,
          "9": 1,
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "VMs by network (may overlap)" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "VM distribution by NIC count" }),
    );

    expect(renderedDonut().legend).toMatchObject({
      "5 NIC": chart_color_green_300.value,
      "6 NIC": chart_color_orange_100.value,
      "7 NIC": chart_color_red_orange_200.value,
      "8 NIC": chart_color_teal_400.value,
      "9 NIC": chart_color_black_500.value,
    });
  });
});

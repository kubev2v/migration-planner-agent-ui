import "@testing-library/jest-dom";
import {
  chart_color_blue_300,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_teal_200,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MigrationDonutChartProps } from "../../charts/MigrationDonutChart.js";
import {
  ClustersOverview,
  type InventoryDataLike,
} from "../ClustersOverview.js";

const donutProps = vi.hoisted(() => ({
  current: null as MigrationDonutChartProps | null,
}));

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: (props: MigrationDonutChartProps): JSX.Element => {
    donutProps.current = props;
    return (
      <div data-testid="clusters-donut">
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
    throw new Error("expected a clusters donut to render");
  }
  return props;
};

const selectView = async (name: string): Promise<void> => {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "VM distribution by cluster" }),
  );
  await user.click(screen.getByRole("menuitem", { name }));
};

describe("ClustersOverview", () => {
  it("shows the cluster empty state when no clusters were collected", () => {
    render(<ClustersOverview />);

    expect(screen.getByText("Clusters")).toBeInTheDocument();
    expect(screen.getByText("Top 5 clusters")).toBeInTheDocument();
    expect(screen.getByText("Cluster data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("clusters-donut")).not.toBeInTheDocument();
  });

  it("keeps the top 4 clusters and rolls the rest into one slice", () => {
    render(
      <ClustersOverview
        clusters={{
          a: { vms: { total: 10 } },
          b: { vms: { total: 8 } },
          c: { vms: { total: 6 } },
          d: { vms: { total: 4 } },
          e: { vms: { total: 3 } },
          f: {},
          g: { vms: { total: Number.NaN } },
          h: { vms: { total: -2 } },
        }}
      />,
    );

    expect(screen.getByTestId("clusters-donut")).toHaveTextContent("31 VMs");

    const props = renderedDonut();
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["Cluster 1", 10],
      ["Cluster 2", 8],
      ["Cluster 3", 6],
      ["Cluster 4", 4],
      ["Rest of clusters", 3],
    ]);
    expect(props.data[0]?.countDisplay).toBe("10 VMs");
    expect(props.legend).toEqual({
      "Cluster 1": chart_color_blue_300.value,
      "Cluster 2": chart_color_purple_300.value,
      "Cluster 3": chart_color_purple_100.value,
      "Cluster 4": chart_color_teal_200.value,
      "Rest of clusters": chart_color_yellow_400.value,
    });
    expect(props.legendVariant).toBe("html");
    expect(props.height).toBe(300);
    expect(props.width).toBe(420);
    expect(props.donutThickness).toBe(18);
    expect(props.titleFontSize).toBe(34);
    expect(props.subTitleColor).toBe(
      "var(--pf-t--global--text--color--subtle)",
    );
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "Cluster 1",
          y: 10,
          countDisplay: "10 VMs",
          legendCategory: "Cluster 1",
        },
        percent: 32.258,
        total: 31,
      }),
    ).toBe("10 VMs\n32.3%");
  });

  it("passes the chart legend variant through", () => {
    render(
      <ClustersOverview
        legendVariant="chart"
        clusters={{ a: { vms: { total: 2 } } }}
      />,
    );

    expect(renderedDonut().legendVariant).toBe("chart");
  });

  it("plots cluster counts per data center and ignores non-numeric entries", async () => {
    render(
      <ClustersOverview
        clustersPerDatacenter={
          [1, 5, Number.NaN, 2, 4, 3, -1, "3"] as unknown as number[]
        }
        clusters={{ a: { vms: { total: 1 } } }}
      />,
    );

    await selectView("Cluster distribution by data center");

    expect(screen.getByText("Top 5 datacenters")).toBeInTheDocument();
    expect(screen.getByTestId("clusters-donut")).toHaveTextContent(
      "15 Clusters",
    );

    const props = renderedDonut();
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["Data center 1", 5],
      ["Data center 2", 4],
      ["Data center 3", 3],
      ["Data center 4", 2],
      ["Rest of datacenters", 1],
    ]);
    expect(props.data[4]?.countDisplay).toBe("1 clusters");
    expect(props.subTitle).toBe("Clusters");
  });

  it("shows the cluster empty state when datacenter counts are unusable", async () => {
    render(
      <ClustersOverview
        clustersPerDatacenter={"nope" as unknown as number[]}
        clusters={{ a: { vms: { total: 1 } } }}
      />,
    );

    await selectView("Cluster distribution by data center");

    expect(screen.getByText("Cluster data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("clusters-donut")).not.toBeInTheDocument();
  });

  it("renders the top 5 CPU overcommitment ratios as boxes and a legend", async () => {
    render(
      <ClustersOverview
        clusters={{
          low: { infra: { cpuOverCommitment: 0.5 } },
          high: { infra: { cpuOverCommitment: 8 } },
          ratio: { infra: { cpuOverCommitment: "  1 : 4.25  " } },
          numericString: { infra: { cpuOverCommitment: "3.5" } },
          integer: { infra: { cpuOverCommitment: 2 } },
          sixth: { infra: { cpuOverCommitment: 1 } },
        }}
      />,
    );

    await selectView("Cluster CPU over commitment");

    expect(screen.queryByTestId("clusters-donut")).not.toBeInTheDocument();
    expect(screen.getByText("8")).toHaveStyle({
      background: chart_color_blue_300.value,
    });
    expect(screen.getByText("4.25")).toHaveStyle({
      background: chart_color_purple_300.value,
    });
    expect(screen.getByText("3.5")).toHaveStyle({
      background: chart_color_purple_100.value,
    });
    expect(screen.getByText("2")).toHaveStyle({
      background: chart_color_teal_200.value,
    });
    expect(screen.getByText("1")).toHaveStyle({
      background: chart_color_yellow_400.value,
    });
    expect(screen.queryByText("0.5")).not.toBeInTheDocument();
    expect(screen.getByText("Cluster 1 (8)")).toBeInTheDocument();
    expect(screen.getByText("Cluster 5 (1)")).toBeInTheDocument();
    expect(screen.queryByText("Cluster 6 (0.5)")).not.toBeInTheDocument();
  });

  it("does not crash when cpuOverCommitment is missing or an unexpected shape", async () => {
    const clusters: Record<string, InventoryDataLike> = {
      missing: {},
      blank: { infra: { cpuOverCommitment: "   " } },
      garbage: { infra: { cpuOverCommitment: "lots" } },
      negative: { infra: { cpuOverCommitment: -2 } },
      objectRatio: { infra: { cpuOverCommitment: { ratio: 4 } } },
      nonObject: "cluster" as unknown as InventoryDataLike,
    };

    render(
      <ClustersOverview
        clusters={{
          ...clusters,
          stringInfra: {
            infra: "nope" as unknown as InventoryDataLike["infra"],
          },
          arrayClusters: ["1:4"] as unknown as InventoryDataLike,
        }}
      />,
    );

    await selectView("Cluster CPU over commitment");

    expect(
      screen.getByText("CPU overcommitment data not collected"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("clusters-donut")).not.toBeInTheDocument();
  });
});

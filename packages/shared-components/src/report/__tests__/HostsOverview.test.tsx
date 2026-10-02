import "@testing-library/jest-dom";
import {
  chart_color_blue_300,
  chart_color_green_300,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_teal_200,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MigrationDonutChartProps } from "../../charts/MigrationDonutChart.js";
import { HostsOverview } from "../HostsOverview.js";

const donutProps = vi.hoisted(() => ({
  current: null as MigrationDonutChartProps | null,
}));

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: (props: MigrationDonutChartProps): JSX.Element => {
    donutProps.current = props;
    return (
      <div data-testid="hosts-donut">
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
    throw new Error("expected the host model donut to render");
  }
  return props;
};

describe("HostsOverview", () => {
  it("shows the shared empty state when no hosts are available", () => {
    render(<HostsOverview />);

    expect(screen.getByText("Host distribution by model")).toBeInTheDocument();
    expect(screen.getByText("Top 5 models")).toBeInTheDocument();
    expect(screen.getByText("Host data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("hosts-donut")).not.toBeInTheDocument();
  });

  it("buckets host counts into the top 5 models plus Other models", () => {
    render(
      <HostsOverview
        hosts={[
          { model: "M1" },
          { model: "M1" },
          { model: "M1" },
          { model: "M1" },
          { model: "M1" },
          { model: "M1" },
          { model: "M2" },
          { model: "M2" },
          { model: "M2" },
          { model: "M2" },
          { model: "M2" },
          { model: "M3" },
          { model: "M3" },
          { model: "M3" },
          { model: "M3" },
          { model: "M4" },
          { model: "M4" },
          { model: "M4" },
          { model: "M5" },
          { model: "M5" },
          { model: "M6" },
          { model: "M7" },
        ]}
      />,
    );

    expect(screen.getByTestId("hosts-donut")).toHaveTextContent("22 Hosts");

    const props = renderedDonut();
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["M1", 6],
      ["M2", 5],
      ["M3", 4],
      ["M4", 3],
      ["M5", 2],
      ["Other models", 2],
    ]);
    expect(props.data[5]?.countDisplay).toBe("2 hosts");
    expect(props.legend).toEqual({
      M1: chart_color_blue_300.value,
      M2: chart_color_purple_300.value,
      M3: chart_color_purple_100.value,
      M4: chart_color_teal_200.value,
      M5: chart_color_yellow_400.value,
      "Other models": chart_color_green_300.value,
    });
    expect(props.legendVariant).toBe("html");
    expect(props.height).toBe(300);
    expect(props.width).toBe(420);
    expect(props.donutThickness).toBe(18);
    expect(props.titleFontSize).toBe(34);
    expect(props.legendWidth).toBe(680);
    expect(props.itemsPerRow).toBe(2);
    expect(props.labelFontSize).toBe(16);
    expect(props.marginLeft).toBe("0%");
    expect(props.subTitleColor).toBe(
      "var(--pf-t--global--text--color--subtle)",
    );
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "M1",
          y: 6,
          countDisplay: "6 hosts",
          legendCategory: "M1",
        },
        percent: 27.2727,
        total: 22,
      }),
    ).toBe("6 hosts\n27.3%");
  });

  it("treats numeric models as labels and blank models as unknown", () => {
    render(
      <HostsOverview
        legendVariant="chart"
        hosts={[{ model: 42 }, { model: "   " }, { model: "  R640  " }]}
      />,
    );

    expect(renderedDonut().data.map((slice) => slice.name)).toEqual([
      "42",
      "Unknown model",
      "R640",
    ]);
    expect(renderedDonut().legendVariant).toBe("chart");
    expect(renderedDonut().title).toBe("3");
  });
});

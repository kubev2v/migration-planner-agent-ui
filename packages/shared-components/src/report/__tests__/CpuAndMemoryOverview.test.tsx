import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MigrationDonutChartProps } from "../../charts/MigrationDonutChart.js";
import { CpuAndMemoryOverview } from "../CpuAndMemoryOverview.js";

const donutProps = vi.hoisted(() => ({
  current: null as MigrationDonutChartProps | null,
}));

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: (props: MigrationDonutChartProps): JSX.Element => {
    donutProps.current = props;
    return (
      <div data-testid="cpu-memory-donut">
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
    throw new Error("expected a CPU and memory donut to render");
  }
  return props;
};

describe("CpuAndMemoryOverview", () => {
  it("shows the memory empty state when no memory tiers were collected", () => {
    render(<CpuAndMemoryOverview />);

    expect(screen.getByText("CPU & memory")).toBeInTheDocument();
    expect(screen.getByText("Memory size tiers")).toBeInTheDocument();
    expect(screen.getByText("Memory data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("cpu-memory-donut")).not.toBeInTheDocument();
  });

  it("plots memory tiers from a plain count map and appends GB", () => {
    render(
      <CpuAndMemoryOverview
        memoryTierDistribution={{
          "129-256": 1,
          "0-4": 2,
          "256+": 3,
          "5-16 GB": 4,
          "17–32": 5,
          unused: 0,
        }}
        memoryTotalGB={1024}
      />,
    );

    const props = renderedDonut();
    expect(props.title).toBe("15 VMs");
    expect(props.subTitle).toBe(`${(1024).toLocaleString()} GB`);
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["0-4 GB", 2],
      ["5-16 GB", 4],
      ["17–32 GB", 5],
      ["129-256 GB", 1],
      ["256+ GB", 3],
    ]);
    expect(props.data.map((slice) => slice.legendCategory)).toEqual([
      "0-4",
      "5-16 GB",
      "17–32",
      "129-256",
      "256+",
    ]);
    expect(props.legend).toEqual({
      "0-4": "#0066cc",
      "5-16 GB": "#5e40be",
      "17–32": "#b6a6e9",
      "129-256": "#73c5c5",
      "256+": "#b98412",
    });
    expect(props.legendVariant).toBe("html");
    expect(props.marginLeft).toBeUndefined();
    expect(props.onItemClick).toBeUndefined();
    expect(props.onTitleClick).toBeUndefined();
    expect(
      props.legendLabelFormatter?.({ x: "0-4 GB", countDisplay: "2 VMs" }),
    ).toBe("0-4 GB (2 VMs)");
    expect(
      props.tooltipLabelFormatter?.({
        datum: {
          x: "0-4 GB",
          y: 2,
          countDisplay: "2 VMs",
          legendCategory: "0-4",
        },
        percent: 13.333,
        total: 15,
      }),
    ).toBe("2 VMs\n13.3%");
  });

  it("calls onTierSelect with the memory distribution key", () => {
    const onTierSelect = vi.fn();
    const onTitleClick = vi.fn();
    render(
      <CpuAndMemoryOverview
        memoryTierDistribution={{ "0-4": 2 }}
        onTierSelect={onTierSelect}
        onTitleClick={onTitleClick}
      />,
    );

    renderedDonut().onItemClick?.({
      name: "0-4 GB",
      count: 2,
      legendCategory: "0-4",
    });
    renderedDonut().onTitleClick?.();

    expect(onTierSelect).toHaveBeenCalledTimes(1);
    expect(onTierSelect).toHaveBeenCalledWith("0-4");
    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it("switches to vCPU tiers and omits slice clicks", async () => {
    const user = userEvent.setup();
    const onTierSelect = vi.fn();
    render(
      <CpuAndMemoryOverview
        legendVariant="chart"
        cpuTierDistribution={{
          "8": 1,
          "2 cores": 2,
          "1-2": 4,
          "4+": 1,
          idle: 0,
        }}
        cpuTotalCores={64}
        memoryTierDistribution={{ "0-4": 2 }}
        onTierSelect={onTierSelect}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "VM distribution by memory size tier",
      }),
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: "VM distribution by vCPU count tier",
      }),
    );

    expect(screen.getByText("vCPU count tiers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "VM distribution by vCPU count tier",
      }),
    ).toBeInTheDocument();

    const props = renderedDonut();
    expect(props.title).toBe("8 VMs");
    expect(props.subTitle).toBe(`${(64).toLocaleString()} Cores`);
    expect(props.legendVariant).toBe("chart");
    expect(props.marginLeft).toBe("52%");
    expect(props.labelFontSize).toBe(18);
    expect(props.itemsPerRow).toBe(2);
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["1-2 cores", 4],
      ["2 cores", 2],
      ["4+ cores", 1],
      ["8 cores", 1],
    ]);
    expect(props.onItemClick).toBeUndefined();
  });

  it("shows the CPU empty state when the selected distribution is empty", async () => {
    const user = userEvent.setup();
    render(<CpuAndMemoryOverview cpuTierDistribution={{}} />);

    await user.click(
      screen.getByRole("button", {
        name: "VM distribution by memory size tier",
      }),
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: "VM distribution by vCPU count tier",
      }),
    );

    expect(screen.getByText("CPU data not collected")).toBeInTheDocument();
    expect(screen.queryByTestId("cpu-memory-donut")).not.toBeInTheDocument();
  });
});

import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MigrationDonutChartProps } from "../../charts/MigrationDonutChart.js";
import { chartColorFailure, chartColorSuccess } from "../constants.js";
import { VMMigrationStatus } from "../VMMigrationStatus.js";

const donutProps = vi.hoisted(() => ({
  current: null as MigrationDonutChartProps | null,
}));

vi.mock("../../charts/MigrationDonutChart.js", () => ({
  MigrationDonutChart: (props: MigrationDonutChartProps): JSX.Element => {
    donutProps.current = props;
    return (
      <div data-testid="migration-donut">
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
    throw new Error("expected a migration-status donut to render");
  }
  return props;
};

const selectView = async (name: string): Promise<void> => {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "No issues vs with issues" }),
  );
  await user.click(screen.getByRole("menuitem", { name }));
};

describe("VMMigrationStatus", () => {
  it("shows the empty state when there are no VMs", () => {
    render(<VMMigrationStatus data={{ migratable: 0, nonMigratable: 0 }} />);

    expect(screen.getByText("VM Migration Status")).toBeInTheDocument();
    expect(
      screen.getByText("Migration status data not collected"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("migration-donut")).not.toBeInTheDocument();
  });

  it("renders the migratable vs not-ready donut", () => {
    render(<VMMigrationStatus data={{ migratable: 7, nonMigratable: 3 }} />);

    expect(screen.getByTestId("migration-donut")).toHaveTextContent("10 VMs");

    const props = renderedDonut();
    expect(props.data.map((slice) => [slice.name, slice.count])).toEqual([
      ["Migratable", 7],
      ["Not ready for migration", 3],
    ]);
    expect(props.legend).toEqual({
      Migratable: chartColorSuccess,
      "Not ready for migration": chartColorFailure,
    });
    expect(props.legendVariant).toBe("html");
    expect(props.subTitleColor).toBe(
      "var(--pf-t--global--text--color--subtle)",
    );
  });

  it("drills down into readiness when a donut slice is clicked", () => {
    const onReadinessSelect = vi.fn();
    render(
      <VMMigrationStatus
        data={{ migratable: 7, nonMigratable: 3 }}
        onReadinessSelect={onReadinessSelect}
      />,
    );

    const props = renderedDonut();
    const [migratable, notReady] = props.data;
    if (!migratable || !notReady) {
      throw new Error("expected both readiness slices");
    }

    props.onItemClick?.(migratable);
    expect(onReadinessSelect).toHaveBeenLastCalledWith(true);

    props.onItemClick?.(notReady);
    expect(onReadinessSelect).toHaveBeenLastCalledWith(false);
  });

  it("forwards the center-title click", () => {
    const onTitleClick = vi.fn();
    render(
      <VMMigrationStatus
        data={{ migratable: 1, nonMigratable: 0 }}
        onTitleClick={onTitleClick}
      />,
    );

    renderedDonut().onTitleClick?.();
    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it("renders the issue breakdown bars in category order", async () => {
    render(
      <VMMigrationStatus
        data={{ migratable: 1, nonMigratable: 9 }}
        issuesBreakdown={{
          critical: 3,
          error: 2,
          warning: 5,
          information: 1,
          advisory: 0,
        }}
      />,
    );

    await selectView("With issues breakdown");

    expect(screen.queryByTestId("migration-donut")).not.toBeInTheDocument();
    expect(screen.getByTitle("Critical: 3 VMs")).toBeInTheDocument();
    expect(screen.getByTitle("Warning: 5 VMs")).toBeInTheDocument();
    expect(screen.getByTitle("Advisory: 0 VMs")).toBeInTheDocument();
    expect(
      screen.getByText(/Totals may exceed the unique VM count/),
    ).toBeInTheDocument();
  });

  it("drills down into a concern category when a bar is clicked", async () => {
    const onCategorySelect = vi.fn();
    render(
      <VMMigrationStatus
        data={{ migratable: 1, nonMigratable: 9 }}
        issuesBreakdown={{
          critical: 3,
          error: 2,
          warning: 5,
          information: 1,
          advisory: 0,
        }}
        onCategorySelect={onCategorySelect}
      />,
    );

    await selectView("With issues breakdown");
    await userEvent.setup().click(screen.getByTitle("Warning: 5 VMs"));

    expect(onCategorySelect).toHaveBeenCalledWith("Warning");
  });

  it("shows the breakdown empty state when no issue data was collected", async () => {
    render(<VMMigrationStatus data={{ migratable: 1, nonMigratable: 9 }} />);

    await selectView("With issues breakdown");

    expect(
      screen.getByText("Issues breakdown data not collected"),
    ).toBeInTheDocument();
  });

  it("passes the chart legend variant through", () => {
    render(
      <VMMigrationStatus
        legendVariant="chart"
        data={{ migratable: 1, nonMigratable: 1 }}
      />,
    );

    expect(renderedDonut().legendVariant).toBe("chart");
  });
});

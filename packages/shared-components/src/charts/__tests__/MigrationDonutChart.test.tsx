import "@testing-library/jest-dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  MigrationDonutChart,
  type MigrationDonutChartDatum,
} from "../MigrationDonutChart.js";

afterEach(() => cleanup());

/**
 * Victory renders one `<path role="presentation">` per slice handed to ChartDonut.
 * Only real pie slices carry an arc command (`A`) in their path data — legend
 * symbols are squares — so filtering on it isolates the donut slices.
 */
const sliceCount = (container: HTMLElement): number =>
  Array.from(container.querySelectorAll("path[role='presentation']")).filter(
    (path) => (path.getAttribute("d") ?? "").includes("A"),
  ).length;

describe("MigrationDonutChart", () => {
  it("does not render slices for zero-value categories", () => {
    // Fixed-category chart (e.g. power states) where only one category is populated.
    const data: MigrationDonutChartDatum[] = [
      { name: "Powered on", count: 7, legendCategory: "Powered on" },
      { name: "Powered off", count: 0, legendCategory: "Powered off" },
      { name: "Standby", count: 0, legendCategory: "Standby" },
      { name: "Not responding", count: 0, legendCategory: "Not responding" },
      { name: "Maintenance", count: 0, legendCategory: "Maintenance" },
    ];

    const { container } = render(
      <MigrationDonutChart data={data} legendVariant="chart" />,
    );

    // Only the single populated slice should be drawn, leaving no empty gap.
    expect(sliceCount(container)).toBe(1);
  });

  it("renders one slice per populated category", () => {
    const data: MigrationDonutChartDatum[] = [
      { name: "Powered on", count: 5, legendCategory: "Powered on" },
      { name: "Powered off", count: 3, legendCategory: "Powered off" },
      { name: "Standby", count: 0, legendCategory: "Standby" },
    ];

    const { container } = render(
      <MigrationDonutChart data={data} legendVariant="chart" />,
    );

    expect(sliceCount(container)).toBe(2);
  });
});

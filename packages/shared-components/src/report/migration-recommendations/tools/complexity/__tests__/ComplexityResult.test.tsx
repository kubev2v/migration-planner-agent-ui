import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ComplexityResult } from "../ComplexityResult.js";
import type { ComplexityOSNameEntryLike } from "../complexityTypes.js";
import { OS_CHART_MAX_BARS } from "../osComplexityChartData.js";

vi.mock("@patternfly/react-charts/dist/esm/victory/index.js", () => ({
  Chart: ({ children }: { children?: ReactNode }) => (
    <div data-testid="os-chart">{children}</div>
  ),
  ChartAxis: (): null => null,
  ChartBar: ({ data }: { data: Array<{ x: string; y: number }> }) => (
    <div data-testid="os-chart-data">{JSON.stringify(data)}</div>
  ),
  ChartPie: () => <div data-testid="disk-chart" />,
  ChartThemeColor: { multiUnordered: "multiUnordered" },
  ChartTooltip: (): null => null,
  ChartVoronoiContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const osEntry = (
  osName: string,
  score: number,
  vmCount: number,
): ComplexityOSNameEntryLike => ({
  osName,
  score,
  vmCount,
});

describe("ComplexityResult OS chart", () => {
  it("limits the chart to OS_CHART_MAX_BARS and keeps the full table", () => {
    const complexityByOSName = Array.from(
      { length: OS_CHART_MAX_BARS + 3 },
      (_, index) => osEntry(`OS ${index}`, 1, index + 1),
    );

    render(
      <ComplexityResult
        clusterName="cluster-1"
        complexityOutput={{
          complexityByDisk: [],
          complexityByOS: [],
          complexityByOSName,
          diskSizeRatings: {},
          osRatings: {},
        }}
        isLoading={false}
        error={null}
        estimationByComplexity={null}
        isLoadingEstimationByComplexity={false}
        estimationByComplexityError={null}
      />,
    );

    expect(
      screen.getByText(
        `Showing ${OS_CHART_MAX_BARS} of ${complexityByOSName.length} operating systems. The full list is in the table below.`,
      ),
    ).toBeInTheDocument();

    const chartData = JSON.parse(
      screen.getByTestId("os-chart-data").textContent ?? "[]",
    ) as Array<{ x: string }>;
    expect(chartData).toHaveLength(OS_CHART_MAX_BARS);

    expect(screen.getByText("OS 0")).toBeInTheDocument();
    expect(
      screen.getByText(`OS ${complexityByOSName.length - 1}`),
    ).toBeInTheDocument();
  });
});

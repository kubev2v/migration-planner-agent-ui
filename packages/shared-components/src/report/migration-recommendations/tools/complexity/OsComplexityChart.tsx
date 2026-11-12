import { css } from "@emotion/css";
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartThemeColor,
  ChartTooltip,
  ChartVoronoiContainer,
} from "@patternfly/react-charts/dist/esm/victory/index.js";
import type { FC } from "react";
import { memo, useMemo } from "react";

import {
  themedChartTooltipFlyoutPadding,
  themedChartTooltipFlyoutStyle,
  themedChartTooltipStyle,
} from "../../../../charts/chartTooltipStyles.js";
import {
  COMPLEXITY_COLORS,
  getComplexityLabel,
} from "./complexityConstants.js";
import type { ComplexityOSNameEntryLike } from "./complexityTypes.js";

const OS_CHART_WIDTH = 600;
const OS_CHART_FONT_SIZE = 14; // Match PatternFly table body
const OS_LABEL_MAX_LENGTH = 32;

const truncateOsChartLabel = (name: string): string =>
  name.length > OS_LABEL_MAX_LENGTH
    ? `${name.slice(0, OS_LABEL_MAX_LENGTH)}…`
    : name;

const chartContainerStyle = css`
  overflow-x: auto;
  overflow-y: hidden;
  max-width: ${OS_CHART_WIDTH}px;

  /*
   * PatternFly Chart SVGs default to width: 100%. Victory fontSize is in
   * chart units (this chart is ${OS_CHART_WIDTH} wide), so stretching the SVG
   * to the page makes tick labels and tooltips look huge.
   */
  svg {
    width: ${OS_CHART_WIDTH}px;
    max-width: 100%;
    height: auto;
  }
`;

interface ChartDatumWithScore {
  x: string;
  y: number;
  score: number;
}

export interface OsComplexityChartProps {
  data: ComplexityOSNameEntryLike[];
}

export const OsComplexityChart: FC<OsComplexityChartProps> = memo(
  ({ data }) => {
    const chartData = useMemo(
      () =>
        data.map((item) => ({
          x: item.osName,
          y: item.vmCount,
          score: item.score,
        })),
      [data],
    );

    const yMax = useMemo(() => {
      const maxVmCount = Math.max(0, ...data.map((item) => item.vmCount));
      return Math.max(maxVmCount * 1.1, 1);
    }, [data]);

    if (data.length === 0) {
      return null;
    }

    return (
      <div className={chartContainerStyle}>
        <Chart
          ariaDesc="Horizontal bar chart showing VM count per operating system colored by complexity"
          horizontal
          containerComponent={
            <ChartVoronoiContainer
              responsive={false}
              labels={({ datum }) => {
                const d = datum as ChartDatumWithScore;
                return `${d.x}\n${d.y} VMs - ${getComplexityLabel(d.score)}`;
              }}
              labelComponent={
                <ChartTooltip
                  style={{
                    ...themedChartTooltipStyle,
                    fontSize: OS_CHART_FONT_SIZE,
                  }}
                  flyoutStyle={themedChartTooltipFlyoutStyle}
                  flyoutPadding={themedChartTooltipFlyoutPadding}
                />
              }
              constrainToVisibleArea
            />
          }
          domain={{ y: [0, yMax] }}
          domainPadding={{ x: [10, 10] }}
          height={Math.max(200, data.length * 34)}
          padding={{ top: 10, bottom: 40, left: 230, right: 30 }}
          themeColor={ChartThemeColor.multiUnordered}
          width={OS_CHART_WIDTH}
        >
          <ChartAxis
            tickFormat={(tick: string) => truncateOsChartLabel(String(tick))}
            style={{
              tickLabels: {
                fontSize: OS_CHART_FONT_SIZE,
                fill: "var(--pf-t--global--text--color--regular)",
              },
            }}
          />
          <ChartAxis
            dependentAxis
            showGrid
            style={{
              tickLabels: {
                fontSize: OS_CHART_FONT_SIZE,
                fill: "var(--pf-t--global--text--color--regular)",
              },
              grid: {
                stroke: "var(--pf-t--global--border--color--default)",
              },
            }}
          />
          <ChartBar
            data={chartData}
            barWidth={12}
            style={{
              data: {
                fill: ({ datum }) => {
                  const d = datum as ChartDatumWithScore;
                  return COMPLEXITY_COLORS[d.score] || "#8A8D90";
                },
              },
            }}
          />
        </Chart>
      </div>
    );
  },
);

OsComplexityChart.displayName = "OsComplexityChart";

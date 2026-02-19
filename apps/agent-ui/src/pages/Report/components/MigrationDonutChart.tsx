import { css } from "@emotion/css";
import {
  ChartDonut,
  ChartLabel,
  ChartLegend,
} from "@patternfly/react-charts/victory";
import { Flex, FlexItem } from "@patternfly/react-core";
import type React from "react";
import { useCallback, useMemo } from "react";

interface OSData {
  name: string;
  count: number;
  legendCategory: string;
  countDisplay?: string;
}

interface MigrationDonutChartProps {
  data: OSData[];
  legend?: Record<string, string>;
  customColors?: Record<string, string>;
  legendWidth?: number;
  height?: number;
  width?: number;
  title?: string;
  subTitle?: string;
  titleColor?: string;
  subTitleColor?: string;
  itemsPerRow?: number;
  marginLeft?: string;
  labelFontSize?: number;
  titleFontSize?: number;
  subTitleFontSize?: number;
  donutThickness?: number;
  padAngle?: number;
  tooltipLabelFormatter?: (args: {
    datum: {
      x: string;
      y: number;
      countDisplay?: string | number;
      legendCategory: string;
    };
    percent: number;
    total: number;
  }) => string;
  onItemClick?: (item: OSData) => void;
}

const legendColors = ["#0066cc", "#5e40be", "#b6a6e9", "#b98412"];

const legendStyles = {
  icon: css`
    margin-right: 8px;
  `,
};

const MigrationDonutChart: React.FC<MigrationDonutChartProps> = ({
  data,
  legend,
  customColors,
  legendWidth,
  height = 260,
  width = 420,
  title,
  subTitle,
  titleColor = "#000000",
  subTitleColor = "#000000",
  itemsPerRow = 1,
  marginLeft = "0%",
  labelFontSize = 25,
  titleFontSize = 28,
  subTitleFontSize = 14,
  donutThickness = 45,
  padAngle = 1,
  tooltipLabelFormatter,
  onItemClick,
}) => {
  const dynamicLegend = useMemo(() => {
    return data.reduce(
      (acc, current) => {
        const key = `${current.legendCategory}`;
        if (!acc.seen.has(key)) {
          acc.seen.add(key);
          const color =
            customColors?.[key] ??
            legendColors[(acc.seen.size - 1) % legendColors.length];
          acc.result.push({ [key]: color });
        }
        return acc;
      },
      { seen: new Set(), result: [] } as {
        seen: Set<string>;
        result: Record<string, string>[];
      },
    ).result;
  }, [data, customColors]);

  const chartLegend = legend ? legend : Object.assign({}, ...dynamicLegend);
  const getColor = useCallback(
    (name: string): string => chartLegend[name],
    [chartLegend],
  );

  const chartData = useMemo(() => {
    return data.map((item) => ({
      x: item.name,
      y: item.count,
      legendCategory: item.legendCategory,
      countDisplay: item.countDisplay ?? item.count,
    }));
  }, [data]);

  const colorScale = useMemo(() => {
    return chartData.map((item) => getColor(item.legendCategory));
  }, [chartData, getColor]);

  const legendData = useMemo(() => {
    return chartData.map((item) => ({
      name: `${item.x} (${item.countDisplay})`,
      symbol: { fill: getColor(item.legendCategory) },
    }));
  }, [chartData, getColor]);

  const innerRadius = useMemo(() => {
    const outerApprox = Math.min(width, height) / 2;
    const computed = outerApprox - donutThickness;
    return computed > 0 ? computed : 0;
  }, [width, height, donutThickness]);

  const totalY = useMemo(() => {
    return chartData.reduce((sum, item) => sum + (Number(item.y) || 0), 0);
  }, [chartData]);

  const handleClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Victory chart types are not well-typed
    (event: any) => {
      if (!onItemClick || !event || !event.datum) return;

      // Find the original data item - first try exact name match
      let clickedItem = data.find((item) => item.name === event.datum.x);

      // If no exact name match, fall back to legendCategory match
      if (!clickedItem) {
        clickedItem = data.find(
          (item) => item.legendCategory === event.datum.legendCategory,
        );
      }

      if (clickedItem) {
        onItemClick(clickedItem);
      }
    },
    [onItemClick, data],
  );

  const chartEvents = useMemo(() => {
    if (!onItemClick) return undefined;

    return [
      {
        target: "data" as const,
        eventHandlers: {
          onClick: () => [
            {
              target: "data" as const,
              // biome-ignore lint/suspicious/noExplicitAny: Victory chart types are not well-typed
              mutation: (props: any) => {
                handleClick(props);
                return null;
              },
            },
          ],
        },
      },
    ];
  }, [onItemClick, handleClick]);

  if (!data || data.length === 0) {
    return (
      <div className="pf-v6-u-p-xl pf-v6-u-text-align-center">
        No data available
      </div>
    );
  }

  return (
    <Flex
      direction={{ default: "column" }}
      alignItems={{ default: "alignItemsCenter" }}
      style={{ cursor: onItemClick ? "pointer" : "default" }}
    >
      <ChartDonut
        ariaDesc="Migration data donut chart"
        data={chartData}
        events={chartEvents}
        labels={({
          datum,
        }: {
          datum: {
            x: string;
            y: number;
            legendCategory: string;
            countDisplay?: string | number;
          };
        }) => {
          const percent = totalY > 0 ? (Number(datum.y) / totalY) * 100 : 0;
          return tooltipLabelFormatter
            ? tooltipLabelFormatter({
                datum: {
                  x: datum.x,
                  y: Number(datum.y),
                  countDisplay: datum.countDisplay,
                  legendCategory: datum.legendCategory,
                },
                percent,
                total: totalY,
              })
            : `${datum.x}: ${datum.countDisplay ?? datum.y}`;
        }}
        colorScale={colorScale}
        constrainToVisibleArea
        innerRadius={innerRadius}
        padAngle={padAngle}
        title={title}
        subTitle={subTitle}
        height={height}
        width={width}
        padding={{
          bottom: 5,
          left: 20,
          right: 20,
          top: 0,
        }}
        titleComponent={
          title ? (
            <ChartLabel
              style={[
                {
                  fill: titleColor,
                  fontSize: titleFontSize,
                  fontWeight: "bold",
                },
              ]}
            />
          ) : undefined
        }
        subTitleComponent={
          subTitle ? (
            <ChartLabel
              style={[
                {
                  fill: subTitleColor,
                  fontSize: subTitleFontSize,
                },
              ]}
            />
          ) : undefined
        }
      />
      <Flex
        className="pf-v6-u-w-100"
        style={{
          marginLeft: marginLeft,
          overflow: "hidden",
          minHeight: "40px",
        }}
        justifyContent={{ default: "justifyContentCenter" }}
        alignItems={{ default: "alignItemsFlexStart" }}
      >
        {onItemClick ? (
          // Custom clickable legend
          <Flex
            style={{
              maxWidth: legendWidth ?? 800,
              padding: "var(--pf-t--global--spacer--ml)",
            }}
            spaceItems={{ default: "spaceItemsSm" }}
            justifyContent={{ default: "justifyContentCenter" }}
            alignItems={{ default: "alignItemsCenter" }}
            flexWrap={{ default: "wrap" }}
          >
            {data.map((item, index) => (
              <FlexItem key={`${item.legendCategory}-${item.name}-${index}`}>
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="pf-v6-u-display-inline-flex pf-v6-u-align-items-center"
                  style={{
                    gap: "var(--pf-t--global--spacer--ml)",
                    cursor: "pointer",
                    fontSize: `${labelFontSize}px`,
                    border: "none",
                    background: "none",
                    padding:
                      "var(--pf-t--global--spacer--xs) var(--pf-t--global--spacer--ml)",
                    margin: 0,
                    transition:
                      "opacity var(--pf-t--global--motion--duration--short)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    aria-hidden="true"
                    className={legendStyles.icon}
                  >
                    <title>Legend color indicator</title>
                    <rect
                      width="10"
                      height="10"
                      fill={getColor(item.legendCategory)}
                    />
                  </svg>
                  <span>
                    {item.name} ({item.countDisplay ?? item.count})
                  </span>
                </button>
              </FlexItem>
            ))}
          </Flex>
        ) : (
          // Standard non-clickable legend
          <ChartLegend
            data={legendData}
            orientation="horizontal"
            width={legendWidth ?? 800}
            itemsPerRow={itemsPerRow}
            style={{
              labels: { fontSize: labelFontSize },
            }}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default MigrationDonutChart;

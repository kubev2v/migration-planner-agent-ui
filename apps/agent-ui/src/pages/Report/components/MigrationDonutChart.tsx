import {
  ChartDonut,
  ChartLabel,
  ChartLegend,
} from "@patternfly/react-charts/victory";
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

      // Find the original data item
      const clickedItem = data.find(
        (item) =>
          item.name === event.datum.x ||
          item.legendCategory === event.datum.legendCategory,
      );

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
      <div style={{ padding: "20px", textAlign: "center" }}>
        No data available
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: onItemClick ? "pointer" : "default",
      }}
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
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          marginLeft: marginLeft,
          overflowX: "hidden",
          overflowY: "hidden",
          minHeight: "40px",
        }}
      >
        {onItemClick ? (
          // Custom clickable legend
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 16px",
              justifyContent: "center",
              alignItems: "center",
              maxWidth: legendWidth ?? 800,
              padding: "8px 0",
            }}
          >
            {data.map((item) => (
              <button
                key={item.legendCategory}
                type="button"
                onClick={() => onItemClick(item)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: `${labelFontSize}px`,
                  border: "none",
                  background: "none",
                  padding: "2px 4px",
                  margin: 0,
                  transition: "opacity 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <svg width="10" height="10" aria-hidden="true">
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
            ))}
          </div>
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
      </div>
    </div>
  );
};

export default MigrationDonutChart;

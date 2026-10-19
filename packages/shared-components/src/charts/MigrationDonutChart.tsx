import { css } from "@emotion/css";
// Workaround
// Shared-components ships as strict ESM ("type": "module"), so webpack
// enforces fully-specified imports in consuming apps. The documented
// "@patternfly/react-charts/victory" subpath has no exports map entry and
// resolves to a directory, which webpack refuses under fully-specified —
// breaking the ui-app federated build.
import {
  ChartDonut,
  ChartLabel,
  ChartLegend,
  ChartTooltip,
} from "@patternfly/react-charts/dist/esm/victory/index.js";
import { Flex, FlexItem } from "@patternfly/react-core";
import type { FC, ReactElement } from "react";
import { useCallback, useMemo } from "react";

export interface MigrationDonutChartDatum {
  name: string;
  count: number;
  legendCategory: string;
  countDisplay?: string;
  diskRange?: { min: number; max?: number };
  memoryRange?: { min: number; max?: number };
  clusterNames?: string[];
  networkNames?: string[];
}

export type MigrationDonutChartLegendVariant = "html" | "chart";

export interface MigrationDonutChartProps {
  data: MigrationDonutChartDatum[];
  legend?: Record<string, string>;
  customColors?: Record<string, string>;
  height?: number;
  width?: number;
  title?: string;
  subTitle?: string;
  titleColor?: string;
  subTitleColor?: string;
  marginLeft?: string;
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
  /** Agent-ui: slice / legend click drill-down. */
  onItemClick?: (item: MigrationDonutChartDatum) => void;
  /** Agent-ui: clickable center title overlay. */
  onTitleClick?: () => void;
  /** Agent-ui: custom HTML legend labels (ignored when legendVariant is "chart"). */
  legendLabelFormatter?: (item: {
    x: string;
    countDisplay?: string | number;
  }) => string;
  /**
   * Legend rendering mode.
   * - `"html"` (default): custom clickable legend used by agent-ui
   * - `"chart"`: PatternFly ChartLegend used by ui-app
   */
  legendVariant?: MigrationDonutChartLegendVariant;
  /** ui-app ChartLegend: total legend width. */
  legendWidth?: number;
  /** ui-app ChartLegend: columns per row. */
  itemsPerRow?: number;
  /** ui-app ChartLegend: label font size. */
  labelFontSize?: number;
  /** Prefer themed Victory ChartTooltip (default true for chart legend). */
  useThemedTooltip?: boolean;
}

const legendColors = [
  "#0066cc",
  "#5e40be",
  "#009596",
  "#4cb140",
  "#f0ab00",
  "#b98412",
  "#a30000",
  "#b6a6e9",
];

/** Victory chart tooltips that respect PatternFly light/dark themes. */
const themedChartTooltipStyle = {
  fontSize: 9,
  fill: "var(--pf-t--global--text--color--regular)",
} as const;

const themedChartTooltipFlyoutStyle = {
  stroke: "var(--pf-t--global--border--color--default)",
  strokeWidth: 1,
  fill: "var(--pf-t--global--background--color--floating--default)",
} as const;

const themedChartTooltipFlyoutPadding = {
  top: 6,
  bottom: 6,
  left: 10,
  right: 10,
} as const;

/** Victory SVG text defaults to a serif face; match PatternFly / html2canvas export. */
const chartTextFontFamily =
  "RedHatText, Overpass, Helvetica, Arial, sans-serif";

const styles = {
  legendIcon: css`
    margin-right: 4px;
  `,
  cursorPointer: css`
    cursor: pointer;
  `,
  cursorDefault: css`
    cursor: default;
  `,
  chartContainer: css`
    padding: 1em 0;
  `,
  donutWrapper: css`
    position: relative;
    display: inline-block;
  `,
  legendContainer: css`
    overflow: hidden;
    min-height: 40px;
  `,
  legendButton: css`
    gap: var(--pf-t--global--spacer--lg);
    cursor: pointer;
    border: none;
    background: none;
    padding: var(--pf-t--global--spacer--xs) var(--pf-t--global--spacer--ml);
    margin: 0;
    font-family: ${chartTextFontFamily};
    transition: opacity var(--pf-t--global--motion--duration--short);
    white-space: nowrap;

    &:hover {
      opacity: 0.7;
    }
  `,
  legendLabel: css`
    gap: var(--pf-t--global--spacer--lg);
    padding: var(--pf-t--global--spacer--xs) var(--pf-t--global--spacer--ml);
    font-family: ${chartTextFontFamily};
    white-space: nowrap;
  `,
  legendInner: css`
    max-width: 680px;
    padding: var(--pf-t--global--spacer--ml);
  `,
};

export const MigrationDonutChart: FC<MigrationDonutChartProps> = ({
  data,
  legend,
  customColors,
  height = 260,
  width = 420,
  title,
  subTitle,
  titleColor = "var(--pf-t--global--text--color--regular)",
  subTitleColor = "var(--pf-t--global--text--color--subtle)",
  marginLeft = "0%",
  titleFontSize = 28,
  subTitleFontSize = 14,
  donutThickness = 45,
  padAngle = 1,
  tooltipLabelFormatter,
  onItemClick,
  onTitleClick,
  legendLabelFormatter,
  legendVariant = "html",
  legendWidth,
  itemsPerRow = 1,
  labelFontSize = 25,
  useThemedTooltip,
}) => {
  const showChartLegend = legendVariant === "chart";
  const themedTooltipEnabled = useThemedTooltip ?? showChartLegend;

  const dynamicLegend = useMemo(() => {
    const legendMap: Record<string, string> = {};
    const seen = new Set<string>();

    for (const item of data) {
      const key = item.legendCategory;
      if (!seen.has(key)) {
        seen.add(key);
        legendMap[key] =
          customColors?.[key] ??
          legendColors[(seen.size - 1) % legendColors.length];
      }
    }

    return legendMap;
  }, [data, customColors]);

  const chartLegend = legend ?? dynamicLegend;
  const getColor = useCallback(
    (name: string): string => chartLegend[name] ?? legendColors[0],
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

  // Victory renders zero-value slices as degenerate zero-angle wedges but still
  // keeps a `padAngle` gap around each one.
  const donutChartData = useMemo(
    () => chartData.filter((item) => Number(item.y) > 0),
    [chartData],
  );

  const donutColorScale = useMemo(
    () => donutChartData.map((item) => getColor(item.legendCategory)),
    [donutChartData, getColor],
  );

  // A lone slice has no neighbour to pad against; forcing padAngle to 0 keeps it
  // from leaving a gap against itself.
  const effectivePadAngle = donutChartData.length <= 1 ? 0 : padAngle;

  const legendData = useMemo(() => {
    return chartData.map((item) => ({
      name: `${item.x} (${item.countDisplay})`,
      symbol: { fill: getColor(item.legendCategory) },
    }));
  }, [chartData, getColor]);

  const legendWidthValue = legendWidth ?? 800;
  const legendX = useMemo(() => {
    const symbolAndGap = 34;
    const charWidth = labelFontSize * 0.55;
    const itemWidths = legendData.map(
      (d) => symbolAndGap + d.name.length * charWidth,
    );
    const numCols = Math.min(legendData.length, itemsPerRow);
    const gutter = 16;
    let contentWidth = (numCols - 1) * gutter;
    for (let c = 0; c < numCols; c++) {
      let maxW = 0;
      for (let i = c; i < itemWidths.length; i += itemsPerRow) {
        maxW = Math.max(maxW, itemWidths[i] ?? 0);
      }
      contentWidth += maxW;
    }
    return Math.max(0, (legendWidthValue - contentWidth) / 2);
  }, [legendData, itemsPerRow, legendWidthValue, labelFontSize]);

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
    (props: any) => {
      if (!onItemClick) return;

      const datum = props?.datum;
      if (!datum) return;

      let clickedItem = data.find((item) => item.name === datum.x);

      if (!clickedItem && typeof props.index === "number") {
        clickedItem = data[props.index];
      }

      if (!clickedItem) {
        clickedItem = data.find(
          (item) => item.legendCategory === datum.legendCategory,
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

  const donutTooltip = useMemo(
    () =>
      themedTooltipEnabled ? (
        <ChartTooltip
          style={themedChartTooltipStyle}
          flyoutStyle={themedChartTooltipFlyoutStyle}
          flyoutPadding={themedChartTooltipFlyoutPadding}
        />
      ) : undefined,
    [themedTooltipEnabled],
  );

  const formatLabel = useCallback(
    (datum: {
      x: string;
      y: number;
      legendCategory: string;
      countDisplay?: string | number;
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
    },
    [tooltipLabelFormatter, totalY],
  );

  if (!data || data.length === 0) {
    return null;
  }

  const htmlLegend: ReactElement = (
    <Flex
      className={`${styles.legendContainer} ${css`margin-left: ${marginLeft};`}`}
      justifyContent={{ default: "justifyContentCenter" }}
      alignItems={{ default: "alignItemsFlexStart" }}
    >
      <Flex
        className={styles.legendInner}
        spaceItems={{ default: "spaceItemsMd" }}
        justifyContent={{ default: "justifyContentCenter" }}
        alignItems={{ default: "alignItemsCenter" }}
        flexWrap={{ default: "wrap" }}
      >
        {data.map((item) => {
          const label = legendLabelFormatter
            ? legendLabelFormatter({
                x: item.name,
                countDisplay: item.countDisplay,
              })
            : item.name;

          const content = (
            <>
              <svg
                width="10"
                height="10"
                aria-hidden="true"
                className={styles.legendIcon}
              >
                <title>Legend color indicator</title>
                <rect
                  width="10"
                  height="10"
                  fill={getColor(item.legendCategory)}
                />
              </svg>
              <span>{label}</span>
            </>
          );

          return (
            <FlexItem key={`${item.legendCategory}-${item.name}`}>
              {onItemClick ? (
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className={styles.legendButton}
                >
                  {content}
                </button>
              ) : (
                <span className={styles.legendLabel}>{content}</span>
              )}
            </FlexItem>
          );
        })}
      </Flex>
    </Flex>
  );

  const chartLegendElement: ReactElement = (
    <FlexItem flex={{ default: "flex_1" }}>
      <Flex
        justifyContent={{ default: "justifyContentCenter" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <FlexItem>
          <ChartLegend
            data={legendData}
            orientation="horizontal"
            height={200}
            width={legendWidthValue}
            x={legendX}
            itemsPerRow={itemsPerRow}
            style={{
              labels: {
                fontSize: labelFontSize,
                fill: "var(--pf-t--global--text--color--regular)",
                fontFamily: chartTextFontFamily,
              },
            }}
          />
        </FlexItem>
      </Flex>
    </FlexItem>
  );

  return (
    <Flex
      direction={{ default: "column" }}
      alignItems={{ default: "alignItemsCenter" }}
      className={`${onItemClick ? styles.cursorPointer : styles.cursorDefault} ${styles.chartContainer}`}
    >
      <div className={styles.donutWrapper}>
        <ChartDonut
          ariaDesc="Migration data donut chart"
          data={donutChartData}
          events={chartEvents}
          labelComponent={donutTooltip}
          labels={({
            datum,
          }: {
            datum: {
              x: string;
              y: number;
              legendCategory: string;
              countDisplay?: string | number;
            };
          }) => formatLabel(datum)}
          colorScale={donutColorScale}
          constrainToVisibleArea
          innerRadius={innerRadius}
          padAngle={effectivePadAngle}
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
                    fontFamily: chartTextFontFamily,
                  },
                ]}
              />
            ) : undefined
          }
          subTitleComponent={
            subTitle ? (
              <ChartLabel
                dy={showChartLegend ? 7 : undefined}
                style={[
                  {
                    fill: subTitleColor,
                    fontSize: subTitleFontSize,
                    fontFamily: chartTextFontFamily,
                  },
                ]}
              />
            ) : undefined
          }
        />
        {onTitleClick && title && (
          // biome-ignore lint/a11y/useSemanticElements: Transparent overlay requires precise positioning and styling that button element would interfere with
          <div
            onClick={onTitleClick}
            className={css`
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${innerRadius * 2}px;
              height: ${innerRadius * 2}px;
              cursor: pointer;
              border-radius: 50%;
              z-index: 10;
            `}
            title="Click to view all VMs"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTitleClick();
              }
            }}
          />
        )}
      </div>
      {showChartLegend ? chartLegendElement : htmlLegend}
    </Flex>
  );
};

export default MigrationDonutChart;

import { css } from "@emotion/css";
import { ChartDonut, ChartLabel } from "@patternfly/react-charts/victory";
import { EmptyStateVariant, Flex, FlexItem } from "@patternfly/react-core";
import { InboxIcon } from "@patternfly/react-icons";
import type React from "react";
import { useCallback, useMemo } from "react";
import { AppEmptyState } from "../../../../common/components";

interface OSData {
  name: string;
  count: number;
  legendCategory: string;
  countDisplay?: string;
  diskRange?: { min: number; max?: number };
  memoryRange?: { min: number; max?: number };
  clusterNames?: string[];
  networkNames?: string[];
}

interface MigrationDonutChartProps {
  data: OSData[];
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
  onItemClick?: (item: OSData) => void;
  onTitleClick?: () => void;
  /** When set, used for legend label instead of "name (countDisplay)". */
  legendLabelFormatter?: (item: {
    x: string;
    countDisplay?: string | number;
  }) => string;
}

const legendColors = ["#0066cc", "#5e40be", "#b6a6e9", "#b98412"];

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
    transition: opacity var(--pf-t--global--motion--duration--short);
    white-space: nowrap;

    &:hover {
      opacity: 0.7;
    }
  `,
  legendLabel: css`
    gap: var(--pf-t--global--spacer--lg);
    padding: var(--pf-t--global--spacer--xs) var(--pf-t--global--spacer--ml);
    white-space: nowrap;
  `,
  legendInner: css`
    max-width: 680px;
    padding: var(--pf-t--global--spacer--ml);
  `,
};

const MigrationDonutChart: React.FC<MigrationDonutChartProps> = ({
  data,
  legend,
  customColors,
  height = 260,
  width = 420,
  title,
  subTitle,
  titleColor = "#000000",
  subTitleColor = "#000000",
  marginLeft = "0%",
  titleFontSize = 28,
  subTitleFontSize = 14,
  donutThickness = 45,
  padAngle = 1,
  tooltipLabelFormatter,
  onItemClick,
  onTitleClick,
  legendLabelFormatter,
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

  if (!data || data.length === 0) {
    return (
      <AppEmptyState
        titleText="No data available"
        icon={InboxIcon}
        variant={EmptyStateVariant.xs}
        wrapInBullseye={false}
      />
    );
  }

  return (
    <Flex
      direction={{ default: "column" }}
      alignItems={{ default: "alignItemsCenter" }}
      className={`${onItemClick ? styles.cursorPointer : styles.cursorDefault} ${styles.chartContainer}`}
    >
      <div className={styles.donutWrapper}>
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
    </Flex>
  );
};

export default MigrationDonutChart;

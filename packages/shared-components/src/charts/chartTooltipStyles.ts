/** Victory chart tooltips that respect PatternFly light/dark themes. */
export const themedChartTooltipStyle = {
  fontSize: 9,
  fill: "var(--pf-t--global--text--color--regular)",
} as const;

export const themedChartTooltipFlyoutStyle = {
  stroke: "var(--pf-t--global--border--color--default)",
  strokeWidth: 1,
  fill: "var(--pf-t--global--background--color--floating--default)",
} as const;

export const themedChartTooltipFlyoutPadding = {
  top: 6,
  bottom: 6,
  left: 10,
  right: 10,
} as const;

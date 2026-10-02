import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { ServerIcon } from "@patternfly/react-icons";
import {
  chart_color_blue_300,
  chart_color_green_300,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_teal_200,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
import type { FC } from "react";
import { useMemo } from "react";
import {
  MigrationDonutChart,
  type MigrationDonutChartDatum,
  type MigrationDonutChartLegendVariant,
} from "../charts/MigrationDonutChart.js";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { dashboardStyles } from "./dashboardStyles.js";

/** Smallest host shape this card reads. Apps pass SDK hosts structurally. */
export interface HostLike {
  model?: string | number;
}

export interface HostsOverviewProps {
  hosts?: HostLike[];
  /** `"html"` in agent-ui; ui-app passes `"chart"`. */
  legendVariant?: MigrationDonutChartLegendVariant;
}

const TOP_HOST_MODELS = 5;
const OTHER_MODELS_LABEL = "Other models";
const UNKNOWN_MODEL_LABEL = "Unknown model";
const CHART_ID = "hosts-overview";
const CHART_TITLE = "Host distribution by model";

/**
 * Same categorical order as the ui-app host-model donut, mapped onto
 * PatternFly `chart_color_*` tokens (nearest token where the old hex
 * was not itself a token).
 */
const HOST_MODEL_COLORS = [
  chart_color_blue_300.value,
  chart_color_purple_300.value,
  chart_color_purple_100.value,
  chart_color_teal_200.value,
  chart_color_yellow_400.value,
  chart_color_green_300.value,
];

const cardSubtitle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: 0.85rem;
`;

const hostModelLabel = (model: HostLike["model"]): string => {
  const raw =
    typeof model === "string"
      ? model
      : typeof model === "number"
        ? String(model)
        : "";
  const trimmed = raw.trim();
  return trimmed !== "" ? trimmed : UNKNOWN_MODEL_LABEL;
};

const buildHostModelDonut = (
  hosts: HostLike[],
): {
  slices: MigrationDonutChartDatum[];
  legend: Record<string, string>;
  totalHosts: number;
} => {
  const counts = new Map<string, number>();
  for (const host of hosts) {
    const label = hostModelLabel(host?.model);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const entries = [...counts.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count);

  const top = entries.slice(0, TOP_HOST_MODELS);
  const restSum = entries
    .slice(TOP_HOST_MODELS)
    .reduce((sum, entry) => sum + entry.count, 0);

  const slices: MigrationDonutChartDatum[] = top.map((entry) => ({
    name: entry.model,
    count: entry.count,
    countDisplay: `${entry.count} hosts`,
    legendCategory: entry.model,
  }));

  if (restSum > 0) {
    slices.push({
      name: OTHER_MODELS_LABEL,
      count: restSum,
      countDisplay: `${restSum} hosts`,
      legendCategory: OTHER_MODELS_LABEL,
    });
  }

  const legend: Record<string, string> = {};
  slices.forEach((slice, index) => {
    const color = HOST_MODEL_COLORS[index % HOST_MODEL_COLORS.length];
    if (color) {
      legend[slice.legendCategory] = color;
    }
  });

  return { slices, legend, totalHosts: hosts.length };
};

export const HostsOverview: FC<HostsOverviewProps> = ({
  hosts,
  legendVariant = "html",
}) => {
  const { slices, legend, totalHosts } = useMemo(
    () => buildHostModelDonut(Array.isArray(hosts) ? hosts : []),
    [hosts],
  );

  return (
    <ChartExportSurface id={CHART_ID} title={CHART_TITLE}>
      <Card className={dashboardStyles.card}>
        <CardTitle>
          <Flex
            justifyContent={{ default: "justifyContentSpaceBetween" }}
            alignItems={{ default: "alignItemsCenter" }}
          >
            <FlexItem>
              <div>
                <div>
                  <ServerIcon /> {CHART_TITLE}
                </div>
                <div className={cardSubtitle}>Top 5 models</div>
              </div>
            </FlexItem>
            <ChartHeaderActions chartId={CHART_ID} title={CHART_TITLE} />
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {slices.length === 0 ? (
            <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.hosts} />
          ) : (
            <MigrationDonutChart
              legendVariant={legendVariant}
              data={slices}
              height={300}
              width={420}
              donutThickness={18}
              titleFontSize={34}
              legend={legend}
              legendWidth={680}
              title={`${totalHosts}`}
              subTitle="Hosts"
              subTitleColor="var(--pf-t--global--text--color--subtle)"
              itemsPerRow={2}
              labelFontSize={16}
              marginLeft="0%"
              tooltipLabelFormatter={({ datum, percent }) =>
                `${datum.countDisplay}\n${percent.toFixed(1)}%`
              }
            />
          )}
        </CardBody>
      </Card>
    </ChartExportSurface>
  );
};

HostsOverview.displayName = "HostsOverview";

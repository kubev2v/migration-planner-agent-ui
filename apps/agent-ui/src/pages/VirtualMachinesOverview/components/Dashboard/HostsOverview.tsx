import { css } from "@emotion/css";
import type { Host } from "@openshift-migration-advisor/agent-sdk";
import {
  ChartExportSurface,
  ChartHeaderActions,
  dashboardStyles,
  MigrationDonutChart,
} from "@openshift-migration-advisor/shared-components";
import {
  Card,
  CardBody,
  CardTitle,
  EmptyStateVariant,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { InboxIcon, ServerIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo } from "react";
import { AppEmptyState } from "../../../../common/components";

const styles = {
  cardSubtitle: css`
    color: #6a6e73;
    font-size: 0.85rem;
  `,
};

interface HostsOverviewProps {
  hosts?: Host[];
}

const colorPalette = [
  "#0066cc",
  "#5e40be",
  "#b6a6e9",
  "#73c5c5",
  "#b98412",
  "#28a745",
];

export const HostsOverview: React.FC<HostsOverviewProps> = ({ hosts = [] }) => {
  const { slices, legend, totalHosts } = useMemo(() => {
    const countsMap = hosts.reduce(
      (acc, h) => {
        const model =
          typeof h?.model === "string" && h.model.trim() !== ""
            ? h.model.trim()
            : "Unknown model";
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const entries = Object.entries(countsMap)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    const TOP_N = 5;
    const top = entries.slice(0, TOP_N);
    const rest = entries.slice(TOP_N);
    const restSum = rest.reduce((acc, e) => acc + e.count, 0);

    const slices = top.map((e) => ({
      name: e.model,
      count: e.count,
      countDisplay: `${e.count} hosts`,
      legendCategory: e.model,
    }));

    if (restSum > 0) {
      slices.push({
        name: "Other models",
        count: restSum,
        countDisplay: `${restSum} hosts`,
        legendCategory: "Other models",
      });
    }

    const legendMap: Record<string, string> = {};
    slices.forEach((s, idx) => {
      legendMap[s.legendCategory] = colorPalette[idx % colorPalette.length];
    });

    return { slices, legend: legendMap, totalHosts: hosts.length };
  }, [hosts]);

  const chartId = "hosts-overview";
  const chartTitle = "Host distribution by model";
  return (
    <Card className={dashboardStyles.card} id={chartId}>
      <CardTitle>
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>
            <div>
              <div>
                <ServerIcon /> Host distribution by model
              </div>
              <div className={styles.cardSubtitle}>Top 5 models</div>
            </div>
          </FlexItem>
          <ChartHeaderActions chartId={chartId} title={chartTitle} />
        </Flex>
      </CardTitle>
      <CardBody className={dashboardStyles.cardBodyScrollable}>
        <ChartExportSurface id={chartId} title={chartTitle}>
          {slices.length === 0 ? (
            <AppEmptyState
              titleText="No data available"
              icon={InboxIcon}
              variant={EmptyStateVariant.xs}
              wrapInBullseye={false}
            />
          ) : (
            <MigrationDonutChart
              data={slices}
              height={300}
              width={420}
              donutThickness={18}
              titleFontSize={34}
              legend={legend}
              title={`${totalHosts}`}
              subTitle="Hosts"
              subTitleColor="#9a9da0"
              tooltipLabelFormatter={({
                datum,
                percent,
              }: {
                datum: { countDisplay?: string | number };
                percent: number;
              }) => `${datum.countDisplay}\n${percent.toFixed(1)}%`}
            />
          )}
        </ChartExportSurface>
      </CardBody>
    </Card>
  );
};

HostsOverview.displayName = "HostsOverview";

import { css } from "@emotion/css";
import type { Host } from "@migration-planner-ui/agent-client/models";
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { ServerIcon } from "@patternfly/react-icons";
import type React from "react";
import { useMemo } from "react";
import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";

const styles = {
  cardSubtitle: css`
    color: #6a6e73;
    font-size: 0.85rem;
  `,
};

interface HostsOverviewProps {
  hosts?: Host[];
  isExportMode?: boolean;
}

const colorPalette = [
  "#0066cc",
  "#5e40be",
  "#b6a6e9",
  "#73c5c5",
  "#b98412",
  "#28a745",
];

export const HostsOverview: React.FC<HostsOverviewProps> = ({
  hosts = [],
  isExportMode = false,
}) => {
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

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="hosts-overview"
    >
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
              {!isExportMode && (
                <div className={styles.cardSubtitle}>Top 5 models</div>
              )}
            </div>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <MigrationDonutChart
          data={slices}
          height={300}
          width={420}
          donutThickness={9}
          titleFontSize={34}
          legend={legend}
          title={`${totalHosts}`}
          subTitle="Hosts"
          subTitleColor="#9a9da0"
          itemsPerRow={2}
          marginLeft="0%"
          legendLabelFormatter={({ x }: { x: string }) => x}
          tooltipLabelFormatter={({
            datum,
            percent,
          }: {
            datum: { countDisplay?: string | number };
            percent: number;
          }) => `${datum.countDisplay}\n${percent.toFixed(1)}%`}
          onItemClick={() => {}}
        />
      </CardBody>
    </Card>
  );
};

HostsOverview.displayName = "HostsOverview";

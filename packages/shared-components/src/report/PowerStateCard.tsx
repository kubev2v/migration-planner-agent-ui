import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import type { FC, ReactNode } from "react";
import {
  MigrationDonutChart,
  type MigrationDonutChartDatum,
  type MigrationDonutChartLegendVariant,
} from "../charts/MigrationDonutChart.js";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { dashboardStyles } from "./dashboardStyles.js";

export interface PowerStateCardProps {
  id: string;
  title: string;
  icon: ReactNode;
  emptyTitle: string;
  slices: MigrationDonutChartDatum[];
  legend: Record<string, string>;
  total: number;
  subTitle: string;
  itemsPerRow?: number;
  legendVariant?: MigrationDonutChartLegendVariant;
}

export const PowerStateCard: FC<PowerStateCardProps> = ({
  id,
  title,
  icon,
  emptyTitle,
  slices,
  legend,
  total,
  subTitle,
  itemsPerRow = 2,
  legendVariant = "html",
}) => (
  <Card className={dashboardStyles.card} id={id}>
    <CardTitle>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <FlexItem>
          {icon} {title}
        </FlexItem>
        <ChartHeaderActions chartId={id} title={title} />
      </Flex>
    </CardTitle>
    <CardBody>
      <ChartExportSurface id={id} title={title}>
        {total === 0 ? (
          <CardEmptyState title={emptyTitle} />
        ) : (
          <MigrationDonutChart
            legendVariant={legendVariant}
            data={slices}
            legend={legend}
            height={300}
            width={420}
            donutThickness={18}
            padAngle={1}
            title={`${total}`}
            subTitle={subTitle}
            subTitleColor="var(--pf-t--global--text--color--subtle)"
            titleFontSize={34}
            labelFontSize={16}
            itemsPerRow={itemsPerRow}
            marginLeft="0%"
            tooltipLabelFormatter={({ datum, percent }) =>
              `${datum.countDisplay}\n${percent.toFixed(1)}%`
            }
          />
        )}
      </ChartExportSurface>
    </CardBody>
  </Card>
);

PowerStateCard.displayName = "PowerStateCard";

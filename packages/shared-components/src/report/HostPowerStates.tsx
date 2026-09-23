import { ServerIcon } from "@patternfly/react-icons";
import type { FC, ReactNode } from "react";
import { useMemo } from "react";
import type { MigrationDonutChartLegendVariant } from "../charts/MigrationDonutChart.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { PowerStateCard } from "./PowerStateCard.js";
import { buildHostPowerStateChart } from "./powerStates.js";

export interface HostPowerStatesProps {
  hostPowerStates?: Record<string, number>;
  isExportMode?: boolean;
  legendVariant?: MigrationDonutChartLegendVariant;
  headerActions?: ReactNode;
}

export const HostPowerStates: FC<HostPowerStatesProps> = ({
  hostPowerStates,
  isExportMode = false,
  legendVariant,
  headerActions,
}) => {
  const chart = useMemo(
    () => buildHostPowerStateChart(hostPowerStates),
    [hostPowerStates],
  );

  return (
    <PowerStateCard
      id="esxi-host-power-states"
      title="ESXi host power states"
      icon={<ServerIcon />}
      emptyTitle={REPORT_CARD_EMPTY_STATE_TITLES.hostPowerStates}
      slices={chart.slices}
      legend={chart.legend}
      total={chart.total}
      subTitle="Hosts"
      isExportMode={isExportMode}
      legendVariant={legendVariant}
      headerActions={headerActions}
    />
  );
};

HostPowerStates.displayName = "HostPowerStates";

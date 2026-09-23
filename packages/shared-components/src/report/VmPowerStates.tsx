import { VirtualMachineIcon } from "@patternfly/react-icons";
import type { FC, ReactNode } from "react";
import { useMemo } from "react";
import type { MigrationDonutChartLegendVariant } from "../charts/MigrationDonutChart.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import { PowerStateCard } from "./PowerStateCard.js";
import { buildVmPowerStateChart } from "./powerStates.js";

export interface VmPowerStatesProps {
  powerStates?: Record<string, number>;
  isExportMode?: boolean;
  legendVariant?: MigrationDonutChartLegendVariant;
  headerActions?: ReactNode;
}

export const VmPowerStates: FC<VmPowerStatesProps> = ({
  powerStates,
  isExportMode = false,
  legendVariant,
  headerActions,
}) => {
  const chart = useMemo(
    () => buildVmPowerStateChart(powerStates),
    [powerStates],
  );

  return (
    <PowerStateCard
      id="vm-power-states"
      title="VM power states"
      icon={<VirtualMachineIcon />}
      emptyTitle={REPORT_CARD_EMPTY_STATE_TITLES.vmPowerStates}
      slices={chart.slices}
      legend={chart.legend}
      total={chart.total}
      subTitle="VMs"
      isExportMode={isExportMode}
      legendVariant={legendVariant}
      headerActions={headerActions}
    />
  );
};

VmPowerStates.displayName = "VmPowerStates";

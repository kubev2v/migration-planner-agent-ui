import {
  chart_color_blue_300,
  chart_color_yellow_300,
} from "@patternfly/react-tokens";

/**
 * PatternFly chart color semantics (https://www.patternfly.org/charts/colors-for-charts/design-guidelines/#best-practices):
 *   Blue  → success / migratable / supported
 *   Red-orange → failure / non-migratable / unsupported
 */
export const chartColorSuccess = chart_color_blue_300.value;
export const chartColorFailure = chart_color_yellow_300.value;

export const REPORT_CARD_EMPTY_STATE_TITLES = {
  networks: "Network data not collected",
  nicCount: "NIC count data not collected",
  hosts: "Host data not collected",
  cpuMemory: "CPU and memory data not collected",
  cpu: "CPU data not collected",
  memory: "Memory data not collected",
  storage: "Storage data not collected",
  diskTypes: "Disk type data not collected",
  clusters: "Cluster data not collected",
  cpuOvercommitment: "CPU overcommitment data not collected",
  operatingSystems: "Operating system data not collected",
  migrationStatus: "Migration status data not collected",
  issuesBreakdown: "Issues breakdown data not collected",
} as const;

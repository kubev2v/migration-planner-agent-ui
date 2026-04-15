import { chart_color_blue_300 } from "@patternfly/react-tokens/dist/esm/chart_color_blue_300";
import { chart_color_red_orange_400 } from "@patternfly/react-tokens/dist/esm/chart_color_red_orange_400";

/**
 * PatternFly chart color semantics (https://www.patternfly.org/charts/colors-for-charts/design-guidelines/#best-practices):
 *   Blue  → success / migratable / supported
 *   Red-orange → failure / non-migratable / unsupported
 */
export const chartColorSuccess = chart_color_blue_300.value;
export const chartColorFailure = chart_color_red_orange_400.value;

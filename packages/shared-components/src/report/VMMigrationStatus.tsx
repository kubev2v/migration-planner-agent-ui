import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
} from "@patternfly/react-core";
import { VirtualMachineIcon } from "@patternfly/react-icons";
import {
  chart_color_blue_300,
  chart_color_purple_100,
  chart_color_purple_300,
  chart_color_teal_200,
  chart_color_yellow_400,
} from "@patternfly/react-tokens";
import type { FC, Ref } from "react";
import { useMemo, useState } from "react";
import {
  MigrationDonutChart,
  type MigrationDonutChartLegendVariant,
} from "../charts/MigrationDonutChart.js";
import { CardEmptyState } from "./CardEmptyState.js";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import { chartExportViewsFromLabels } from "./chartExport.js";
import {
  chartColorFailure,
  chartColorSuccess,
  REPORT_CARD_EMPTY_STATE_TITLES,
} from "./constants.js";
import { dashboardStyles } from "./dashboardStyles.js";

/**
 * VM-issue counts this card reads. agent-sdk's `IssuesBreakdown` satisfies it;
 * each field stays optional so older or partial payloads do not throw.
 */
export interface IssuesBreakdownLike {
  critical?: number;
  error?: number;
  warning?: number;
  information?: number;
  advisory?: number;
}

export interface VMMigrationStatusProps {
  data: {
    migratable: number;
    nonMigratable: number;
  };
  issuesBreakdown?: IssuesBreakdownLike;
  /**
   * Donut-slice click. `true` for the migratable slice, `false` otherwise.
   * Agent-ui maps it to a VM migration-readiness filter; ui-app omits it.
   */
  onReadinessSelect?: (isMigratable: boolean) => void;
  /** Breakdown-bar click. The argument is the concern category label. */
  onCategorySelect?: (category: string) => void;
  /** Center-title click. Agent-ui opens the VM list with no extra filters. */
  onTitleClick?: () => void;
  /** `"html"` in agent-ui; ui-app passes `"chart"`. */
  legendVariant?: MigrationDonutChartLegendVariant;
}

type ViewMode = "issuesVsNoIssues" | "issuesBreakdown";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  issuesVsNoIssues: "No issues vs with issues",
  issuesBreakdown: "With issues breakdown",
};

const CHART_ID = "vm-migration-status";
const CHART_TITLE = "VM migration status";

const MIGRATABLE_LABEL = "Migratable";
const NOT_MIGRATABLE_LABEL = "Not ready for migration";

const CATEGORY_ORDER: Array<{ label: string; key: keyof IssuesBreakdownLike }> =
  [
    { label: "Critical", key: "critical" },
    { label: "Error", key: "error" },
    { label: "Warning", key: "warning" },
    { label: "Information", key: "information" },
    { label: "Advisory", key: "advisory" },
  ];

/**
 * Same categorical order as the previous breakdown hex palette, mapped onto
 * PatternFly `chart_color_*` tokens (nearest token where the old hex was not
 * itself a token).
 */
const CATEGORY_COLORS: Record<string, string> = {
  Critical: chart_color_blue_300.value,
  Error: chart_color_purple_300.value,
  Warning: chart_color_purple_100.value,
  Information: chart_color_teal_200.value,
  Advisory: chart_color_yellow_400.value,
};

const menuToggleMinWidth = css`
  min-width: 250px;
`;

const isViewMode = (value: string | number | undefined): value is ViewMode =>
  value === "issuesVsNoIssues" || value === "issuesBreakdown";

const toCount = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

export const VMMigrationStatus: FC<VMMigrationStatusProps> = ({
  data,
  issuesBreakdown,
  onReadinessSelect,
  onCategorySelect,
  onTitleClick,
  legendVariant = "html",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("issuesVsNoIssues");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const totalVMs = data.migratable + data.nonMigratable;

  const donutData = [
    {
      name: MIGRATABLE_LABEL,
      count: data.migratable,
      countDisplay: `${data.migratable} VMs`,
      legendCategory: MIGRATABLE_LABEL,
    },
    {
      name: NOT_MIGRATABLE_LABEL,
      count: data.nonMigratable,
      countDisplay: `${data.nonMigratable} VMs`,
      legendCategory: NOT_MIGRATABLE_LABEL,
    },
  ];

  const legend = {
    [MIGRATABLE_LABEL]: chartColorSuccess,
    [NOT_MIGRATABLE_LABEL]: chartColorFailure,
  };

  const breakdownData = useMemo(() => {
    if (!issuesBreakdown) {
      return [];
    }
    return CATEGORY_ORDER.map(({ label, key }) => ({
      name: label,
      count: toCount(issuesBreakdown[key]),
    }));
  }, [issuesBreakdown]);

  const maxCount = useMemo(
    () =>
      breakdownData.length > 0
        ? Math.max(...breakdownData.map((d) => d.count))
        : 0,
    [breakdownData],
  );

  const chartTitle = `${CHART_TITLE} — ${VIEW_MODE_LABELS[viewMode]}`;

  return (
    <ChartExportSurface
      id={CHART_ID}
      title={chartTitle}
      exportViews={chartExportViewsFromLabels(CHART_TITLE, VIEW_MODE_LABELS)}
      activeExportViewId={viewMode}
      onExportViewChange={(viewId) => {
        if (isViewMode(viewId)) {
          setViewMode(viewId);
        }
      }}
    >
      <Card className={dashboardStyles.card}>
        <CardTitle>
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            justifyContent={{ default: "justifyContentSpaceBetween" }}
          >
            <FlexItem>
              <VirtualMachineIcon /> VM Migration Status
            </FlexItem>
            <ChartHeaderActions chartId={CHART_ID} title={chartTitle}>
              <Dropdown
                isOpen={isDropdownOpen}
                onSelect={(_event, value) => {
                  if (isViewMode(value)) {
                    setViewMode(value);
                  }
                  setIsDropdownOpen(false);
                }}
                onOpenChange={setIsDropdownOpen}
                toggle={(toggleRef: Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsDropdownOpen((open) => !open)}
                    isExpanded={isDropdownOpen}
                    className={menuToggleMinWidth}
                  >
                    {VIEW_MODE_LABELS[viewMode]}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem value="issuesVsNoIssues" key="issuesVsNoIssues">
                    {VIEW_MODE_LABELS.issuesVsNoIssues}
                  </DropdownItem>
                  <DropdownItem value="issuesBreakdown" key="issuesBreakdown">
                    {VIEW_MODE_LABELS.issuesBreakdown}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ChartHeaderActions>
          </Flex>
        </CardTitle>
        <CardBody className={dashboardStyles.cardBodyScrollable}>
          {viewMode === "issuesVsNoIssues" ? (
            totalVMs === 0 ? (
              <CardEmptyState
                title={REPORT_CARD_EMPTY_STATE_TITLES.migrationStatus}
              />
            ) : (
              <MigrationDonutChart
                legendVariant={legendVariant}
                data={donutData}
                legend={legend}
                height={300}
                width={420}
                donutThickness={18}
                padAngle={1}
                title={`${totalVMs}`}
                subTitle="VMs"
                subTitleColor="var(--pf-t--global--text--color--subtle)"
                titleFontSize={34}
                legendLabelFormatter={({ x, countDisplay }) =>
                  `${x} (${countDisplay})`
                }
                onItemClick={
                  onReadinessSelect
                    ? (item) =>
                        onReadinessSelect(item.name === MIGRATABLE_LABEL)
                    : undefined
                }
                onTitleClick={onTitleClick}
              />
            )
          ) : breakdownData.length === 0 ? (
            <CardEmptyState
              title={REPORT_CARD_EMPTY_STATE_TITLES.issuesBreakdown}
            />
          ) : (
            <div>
              <div className={dashboardStyles.storageChartWrapper}>
                <Flex
                  direction={{ default: "row" }}
                  alignItems={{ default: "alignItemsFlexEnd" }}
                  justifyContent={{ default: "justifyContentCenter" }}
                  spaceItems={{ default: "spaceItemsMd" }}
                  style={{
                    height: "250px",
                    width: "100%",
                  }}
                >
                  {breakdownData.map((item) => {
                    const heightPercentage =
                      maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    const minHeightPercentage = item.count > 0 ? 20 : 0;
                    const finalHeightPercentage = Math.max(
                      heightPercentage,
                      minHeightPercentage,
                    );
                    const barColor =
                      CATEGORY_COLORS[item.name] || CATEGORY_COLORS.Critical;

                    return (
                      <Flex
                        key={item.name}
                        direction={{ default: "column" }}
                        alignItems={{ default: "alignItemsCenter" }}
                        spaceItems={{ default: "spaceItemsSm" }}
                        style={{ flex: "1", maxWidth: "120px" }}
                      >
                        <FlexItem
                          style={{
                            height: "200px",
                            display: "flex",
                            alignItems: "flex-end",
                            width: "100%",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onCategorySelect?.(item.name)}
                            title={`${item.name}: ${item.count} VMs`}
                            style={{
                              width: "60px",
                              height: `${finalHeightPercentage}%`,
                              backgroundColor: barColor,
                              transition: "height 0.3s ease",
                              borderRadius: "4px 4px 0 0",
                              cursor: "pointer",
                              border: "none",
                              padding: 0,
                            }}
                          />
                        </FlexItem>
                        <FlexItem>
                          <Content
                            component="small"
                            style={{
                              fontSize: "12px",
                              textAlign: "center",
                              wordBreak: "break-word",
                              color:
                                "var(--pf-t--global--text--color--regular)",
                            }}
                          >
                            {item.name}
                            <br />({item.count} VMs)
                          </Content>
                        </FlexItem>
                      </Flex>
                    );
                  })}
                </Flex>
              </div>
              <div>
                <Content
                  component="small"
                  style={{
                    fontSize: "12px",
                    color: "var(--pf-t--global--text--color--subtle)",
                    marginTop: "16px",
                    textAlign: "center",
                    display: "block",
                  }}
                >
                  Totals may exceed the unique VM count because a VM can appear
                  in multiple categories
                </Content>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </ChartExportSurface>
  );
};

VMMigrationStatus.displayName = "VMMigrationStatus";

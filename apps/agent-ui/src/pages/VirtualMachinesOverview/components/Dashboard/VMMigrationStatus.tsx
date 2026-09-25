import type { IssuesBreakdown } from "@openshift-migration-advisor/agent-sdk";
import {
  ChartExportSurface,
  ChartHeaderActions,
  chartColorFailure,
  chartColorSuccess,
  dashboardStyles,
  MigrationDonutChart,
} from "@openshift-migration-advisor/shared-components";
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
import type React from "react";
import { useMemo, useState } from "react";
import {
  type NavigateToVMFilters,
  useChartDrillDown,
} from "../VirtualMachinesTab/vmNavigation";

type ViewMode = "issuesVsNoIssues" | "issuesBreakdown";

interface VmMigrationStatusProps {
  data: {
    migratable: number;
    nonMigratable: number;
  };
  issuesBreakdown?: IssuesBreakdown;
  onNavigateToVMFilters?: NavigateToVMFilters;
}

const categoryOrder = [
  "Critical",
  "Error",
  "Warning",
  "Information",
  "Advisory",
];

const colorPalette = [
  "#0066cc",
  "#5e40be",
  "#b6a6e9",
  "#73c5c5",
  "#b98412",
  "#28a745",
  "#f0ad4e",
  "#d9534f",
  "#009596",
  "#6a6e73",
];

const categoryColors: Record<string, string> = {
  Critical: colorPalette[0],
  Error: colorPalette[1],
  Warning: colorPalette[2],
  Information: colorPalette[3],
  Advisory: colorPalette[4],
};

export const VMMigrationStatus: React.FC<VmMigrationStatusProps> = ({
  data,
  issuesBreakdown,
  onNavigateToVMFilters,
}) => {
  const navigateToVMs = useChartDrillDown(onNavigateToVMFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("issuesVsNoIssues");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const viewModeLabels: Record<ViewMode, string> = {
    issuesVsNoIssues: "No issues vs with issues",
    issuesBreakdown: "With issues breakdown",
  };

  const donutData = [
    {
      name: "Migratable",
      count: data.migratable,
      countDisplay: `${data.migratable} VMs`,
      legendCategory: "Migratable",
    },
    {
      name: "Not ready for migration",
      count: data.nonMigratable,
      countDisplay: `${data.nonMigratable} VMs`,
      legendCategory: "Not ready for migration",
    },
  ];

  const legend = {
    Migratable: chartColorSuccess,
    "Not ready for migration": chartColorFailure,
  };

  const breakdownData = useMemo(() => {
    if (!issuesBreakdown) return [];

    return categoryOrder.map((category) => ({
      name: category,
      count: issuesBreakdown[category.toLowerCase() as keyof IssuesBreakdown],
    }));
  }, [issuesBreakdown]);

  const maxCount = useMemo(() => {
    return breakdownData.length > 0
      ? Math.max(...breakdownData.map((d) => d.count))
      : 0;
  }, [breakdownData]);

  const handleItemClick = (item: { name: string }) => {
    if (viewMode === "issuesVsNoIssues") {
      const migrationReadiness =
        item.name === "Migratable" ? ["ready"] : ["not-ready"];
      navigateToVMs({ migrationReadiness });
    }
  };

  const handleBreakdownClick = (category: string) => {
    navigateToVMs({
      concernCategories: [category],
    });
  };

  const handleTitleClick = () => {
    navigateToVMs({});
  };

  const totalVMs = data.migratable + data.nonMigratable;

  const chartId = "vm-migration-status";
  const chartTitle = `VM migration status — ${viewModeLabels[viewMode]}`;

  return (
    <Card className={dashboardStyles.card} id={chartId}>
      <CardTitle>
        <Flex
          alignItems={{ default: "alignItemsCenter" }}
          justifyContent={{ default: "justifyContentSpaceBetween" }}
        >
          <FlexItem>
            <VirtualMachineIcon /> VM Migration Status
          </FlexItem>
          <ChartHeaderActions chartId={chartId} title={chartTitle}>
            <Dropdown
              isOpen={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  isExpanded={isDropdownOpen}
                  style={{ minWidth: "250px" }}
                >
                  {viewModeLabels[viewMode]}
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem
                  key="issuesVsNoIssues"
                  onClick={() => {
                    setViewMode("issuesVsNoIssues");
                    setIsDropdownOpen(false);
                  }}
                >
                  {viewModeLabels.issuesVsNoIssues}
                </DropdownItem>
                <DropdownItem
                  key="issuesBreakdown"
                  onClick={() => {
                    setViewMode("issuesBreakdown");
                    setIsDropdownOpen(false);
                  }}
                >
                  {viewModeLabels.issuesBreakdown}
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </ChartHeaderActions>
        </Flex>
      </CardTitle>
      <CardBody className={dashboardStyles.cardBodyScrollable}>
        <ChartExportSurface id={chartId} title={chartTitle}>
          {viewMode === "issuesVsNoIssues" ? (
            <MigrationDonutChart
              data={donutData}
              legend={legend}
              height={300}
              width={420}
              donutThickness={18}
              padAngle={1}
              title={`${totalVMs}`}
              subTitle="VMs"
              subTitleColor="#9a9da0"
              titleFontSize={34}
              legendLabelFormatter={({ x, countDisplay }) =>
                `${x} (${countDisplay})`
              }
              onItemClick={handleItemClick}
              onTitleClick={handleTitleClick}
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
                      categoryColors[item.name] || categoryColors.Critical;

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
                            onClick={() => handleBreakdownClick(item.name)}
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
        </ChartExportSurface>
      </CardBody>
    </Card>
  );
};

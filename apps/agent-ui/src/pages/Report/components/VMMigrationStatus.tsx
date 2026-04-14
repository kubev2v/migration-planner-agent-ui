import { useInjection } from "@migration-planner-ui/ioc";
import type { DefaultApiInterface } from "@openshift-migration-advisor/agent-sdk";
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
  Spinner,
} from "@patternfly/react-core";
import { VirtualMachineIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Symbols } from "../../../main/Symbols";
import { dashboardStyles } from "./dashboardStyles";
import MigrationDonutChart from "./MigrationDonutChart";
import { createVMFilterURL } from "./vmNavigation";

type ViewMode = "issuesVsNoIssues" | "issuesBreakdown";

interface VmMigrationStatusProps {
  data: {
    migratable: number;
    nonMigratable: number;
  };
  isExportMode?: boolean;
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
  isExportMode = false,
}) => {
  const navigate = useNavigate();
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [viewMode, setViewMode] = useState<ViewMode>("issuesVsNoIssues");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [issuesBreakdown, setIssuesBreakdown] = useState<{
    critical: number;
    error: number;
    warning: number;
    information: number;
    advisory: number;
  } | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [isIncompleteData, setIsIncompleteData] = useState(false);
  const [issuesBreakdownError, setIssuesBreakdownError] = useState(false);

  const viewModeLabels: Record<ViewMode, string> = {
    issuesVsNoIssues: "No issues vs with issues",
    issuesBreakdown: "With issues breakdown",
  };

  useEffect(() => {
    if (viewMode === "issuesBreakdown" && !issuesBreakdown && !isExportMode) {
      const fetchIssuesBreakdown = async () => {
        try {
          setIsLoadingBreakdown(true);
          setIsIncompleteData(false);
          setIssuesBreakdownError(false);

          const pageSize = 500;
          const firstResponse = await agentApi.getVMs({
            byExpression: "issues_count >= 1 and migratable = false",
            page: 1,
            pageSize,
          });

          let allVmsWithIssues = [...(firstResponse.vms || [])];

          if (firstResponse.total > allVmsWithIssues.length) {
            const totalPages = firstResponse.pageCount;
            const remainingPages = [];
            for (let page = 2; page <= totalPages; page++) {
              remainingPages.push(
                agentApi.getVMs({
                  byExpression: "issues_count >= 1 and migratable = false",
                  page,
                  pageSize,
                }),
              );
            }

            const remainingResponses = await Promise.all(remainingPages);
            const additionalVms = remainingResponses.flatMap(
              (response) => response.vms || [],
            );
            allVmsWithIssues = [...allVmsWithIssues, ...additionalVms];
          }

          if (firstResponse.total > allVmsWithIssues.length) {
            console.warn(
              `Incomplete data: Expected ${firstResponse.total} VMs, but only received ${allVmsWithIssues.length}`,
            );
            setIsIncompleteData(true);
          }

          const categoryCount: Record<string, Set<string>> = {
            Critical: new Set(),
            Error: new Set(),
            Warning: new Set(),
            Information: new Set(),
            Advisory: new Set(),
          };

          const batchSize = 50;
          const vmDetailsResults: PromiseSettledResult<
            Awaited<ReturnType<typeof agentApi.getVM>>
          >[] = [];

          for (let i = 0; i < allVmsWithIssues.length; i += batchSize) {
            const batch = allVmsWithIssues.slice(i, i + batchSize);
            const batchPromises = batch.map((vm) =>
              agentApi.getVM({ id: vm.id }),
            );
            const batchResults = await Promise.allSettled(batchPromises);
            vmDetailsResults.push(...batchResults);
          }

          let failedVmCount = 0;
          for (const result of vmDetailsResults) {
            if (result.status === "fulfilled") {
              const vmDetail = result.value;
              const issues = vmDetail.issues || [];

              for (const issue of issues) {
                const category = issue.category;
                if (categoryCount[category]) {
                  categoryCount[category].add(vmDetail.id);
                }
              }
            } else {
              failedVmCount++;
              console.error("Error fetching VM details:", result.reason);
            }
          }

          if (failedVmCount > 0) {
            console.warn(
              `Failed to fetch details for ${failedVmCount} VMs. Chart shows partial data.`,
            );
            setIsIncompleteData(true);
          }

          setIssuesBreakdown({
            critical: categoryCount.Critical.size,
            error: categoryCount.Error.size,
            warning: categoryCount.Warning.size,
            information: categoryCount.Information.size,
            advisory: categoryCount.Advisory.size,
          });
        } catch (err) {
          console.error("Error fetching issues breakdown:", err);
          setIssuesBreakdown(null);
          setIssuesBreakdownError(true);
        } finally {
          setIsLoadingBreakdown(false);
        }
      };

      fetchIssuesBreakdown();
    }
  }, [viewMode, issuesBreakdown, agentApi, isExportMode]);

  const donutData = [
    {
      name: "Migratable",
      count: data.migratable,
      countDisplay: `${data.migratable} VMs`,
      legendCategory: "Migratable",
    },
    {
      name: "Non-Migratable",
      count: data.nonMigratable,
      countDisplay: `${data.nonMigratable} VMs`,
      legendCategory: "Non-Migratable",
    },
  ];

  const legend = {
    Migratable: "#28a745",
    "Non-Migratable": "#dc3545",
  };

  const breakdownData = useMemo(() => {
    if (!issuesBreakdown) return [];

    return categoryOrder.map((category) => ({
      name: category,
      count:
        issuesBreakdown[category.toLowerCase() as keyof typeof issuesBreakdown],
    }));
  }, [issuesBreakdown]);

  const maxCount = useMemo(() => {
    return breakdownData.length > 0
      ? Math.max(...breakdownData.map((d) => d.count))
      : 0;
  }, [breakdownData]);

  const handleItemClick = (item: { name: string }) => {
    if (isExportMode) return;

    if (viewMode === "issuesVsNoIssues") {
      const migrationReadiness =
        item.name === "Migratable" ? ["ready"] : ["not-ready"];
      const url = createVMFilterURL({ migrationReadiness });
      navigate(url);
    }
  };

  const handleTitleClick = () => {
    if (isExportMode) return;
    const url = createVMFilterURL({});
    navigate(url);
  };

  const totalVMs = data.migratable + data.nonMigratable;

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="vm-migration-status"
    >
      <CardTitle>
        <Flex
          alignItems={{ default: "alignItemsCenter" }}
          justifyContent={{ default: "justifyContentSpaceBetween" }}
        >
          <FlexItem>
            <VirtualMachineIcon /> VM migration status
          </FlexItem>
          {!isExportMode && (
            <FlexItem>
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
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        {viewMode === "issuesVsNoIssues" ? (
          <MigrationDonutChart
            data={donutData}
            legend={legend}
            height={300}
            width={420}
            donutThickness={9}
            padAngle={1}
            title={`${totalVMs}`}
            subTitle="VMs"
            subTitleColor="#9a9da0"
            titleFontSize={34}
            itemsPerRow={2}
            onItemClick={handleItemClick}
            onTitleClick={!isExportMode ? handleTitleClick : undefined}
          />
        ) : isLoadingBreakdown ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
            }}
          >
            <Spinner size="lg" />
          </div>
        ) : issuesBreakdownError ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
              color: "var(--pf-t--global--color--danger)",
              textAlign: "center",
            }}
          >
            <Content>
              Unable to load issues breakdown data. Please try again later.
            </Content>
          </div>
        ) : (
          <div>
            <div className={dashboardStyles.storageChartWrapper}>
              <Flex
                direction={{ default: "row" }}
                alignItems={{ default: "alignItemsFlexEnd" }}
                justifyContent={{ default: "justifyContentCenter" }}
                spaceItems={{ default: "spaceItemsMd" }}
                style={{
                  height: isExportMode ? "180px" : "250px",
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
                          height: isExportMode ? "140px" : "200px",
                          display: "flex",
                          alignItems: "flex-end",
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: `${finalHeightPercentage}%`,
                            backgroundColor: barColor,
                            transition: "height 0.3s ease",
                            borderRadius: "4px 4px 0 0",
                          }}
                          title={`${item.name}: ${item.count} VMs`}
                        />
                      </FlexItem>
                      <FlexItem>
                        <Content
                          component="small"
                          style={{
                            fontSize: "12px",
                            textAlign: "center",
                            wordBreak: "break-word",
                            color: "var(--pf-t--global--text--color--regular)",
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
                Totals may exceed the unique VM count because a VM can appear in
                multiple categories
              </Content>
              {isIncompleteData && (
                <Content
                  component="small"
                  style={{
                    fontSize: "12px",
                    color: "var(--pf-t--global--color--warning)",
                    marginTop: "8px",
                    textAlign: "center",
                    display: "block",
                    fontWeight: 600,
                  }}
                >
                  Warning: Incomplete data - Some VMs could not be loaded
                </Content>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

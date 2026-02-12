import {
  Button,
  Content,
  Flex,
  FlexItem,
  Popover,
} from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Tr } from "@patternfly/react-table";
import type React from "react";
import { useMemo } from "react";

interface OSData {
  name: string;
  count: number;
  legendCategory: string;
  infoText?: string;
}

interface MigrationChartProps {
  data: OSData[];
  legend?: Record<string, string>;
  maxHeight?: string;
  barHeight?: number;
}

const legendColors = ["#28a745", "#f0ad4e", "#d9534f", "#C9190B"];

const MigrationChart: React.FC<MigrationChartProps> = ({
  data,
  legend,
  maxHeight = "200px",
  barHeight = 8,
}) => {
  const MIN_BAR_PX = 3;
  const dynamicLegend = useMemo(() => {
    return data.reduce(
      (acc, current) => {
        const key = `${current.legendCategory}`;
        if (!acc.seen.has(key)) {
          acc.seen.add(key);
          acc.result.push({
            [key]: legendColors[(acc.seen.size - 1) % legendColors.length],
          });
        }
        return acc;
      },
      { seen: new Set(), result: [] } as {
        seen: Set<string>;
        result: Record<string, string>[];
      },
    ).result;
  }, [data]);

  const sumOfAllCounts = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return data.reduce((sum, item) => sum + item.count, 0) || 1;
  }, [data]);

  const chartLegend = legend ? legend : Object.assign({}, ...dynamicLegend);
  const getColor = (name: string): string => chartLegend[name];

  return (
    <Flex
      direction={{ default: "column" }}
      spaceItems={{ default: "spaceItemsLg" }}
    >
      {/* Legend */}
      <FlexItem>
        <Flex
          spaceItems={{ default: "spaceItemsLg" }}
          justifyContent={{ default: "justifyContentFlexEnd" }}
        >
          {Object.entries(chartLegend).map(([key, color]) => (
            <FlexItem key={key}>
              <Flex
                alignItems={{ default: "alignItemsCenter" }}
                spaceItems={{ default: "spaceItemsSm" }}
              >
                <FlexItem>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: color as string,
                      borderRadius: "2px",
                    }}
                  />
                </FlexItem>
                <FlexItem>
                  <Content component="small">{key}</Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          ))}
        </Flex>
      </FlexItem>
      {/* Chart Area */}
      <FlexItem>
        <Flex
          direction={{ default: "column" }}
          spaceItems={{ default: "spaceItemsMd" }}
        >
          <div style={{ maxHeight: maxHeight, overflowY: "auto" }}>
            <Table variant="compact" borders={false}>
              <Tbody>
                {data.map((item) => (
                  <Tr key={`${item.name}-${item.legendCategory}`}>
                    <Td width={40} style={{ paddingLeft: "0px" }}>
                      <Flex
                        alignItems={{ default: "alignItemsCenter" }}
                        spaceItems={{ default: "spaceItemsSm" }}
                      >
                        <FlexItem>
                          <Content
                            component="p"
                            style={{
                              fontSize: "clamp(0.4rem, 0.7vw, 1.1rem)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              wordBreak: "break-word",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              textTransform: "capitalize",
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {item.name}
                          </Content>
                        </FlexItem>
                        {item.infoText ? (
                          <FlexItem>
                            <Popover
                              position="bottom"
                              headerContent="Upgrade to get support"
                              bodyContent={<div>{item.infoText}</div>}
                            >
                              <Button
                                type="button"
                                aria-label="Open operating system upgrade information"
                                variant="plain"
                              >
                                <InfoCircleIcon color="#6a6ec8" />
                              </Button>
                            </Popover>
                          </FlexItem>
                        ) : null}
                      </Flex>
                    </Td>
                    <Td>
                      {/* Visual Bar */}
                      <div>
                        <div
                          style={{
                            position: "relative",
                            height: `${barHeight}px`,
                            backgroundColor: "#F5F5F5",
                            overflow: "hidden",
                          }}
                        >
                          {(() => {
                            const barWidth =
                              sumOfAllCounts > 0
                                ? (item.count / sumOfAllCounts) * 100
                                : 0;
                            const hasValue = barWidth > 0;
                            return (
                              <div
                                style={{
                                  height: "100%",
                                  width: `${barWidth}%`,
                                  minWidth: hasValue ? `${MIN_BAR_PX}px` : "0",
                                  backgroundColor: `${getColor(item.legendCategory)}`,
                                  transition: "width 0.3s ease",
                                }}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </Td>
                    <Td
                      width={10}
                      style={{ paddingRight: "0px", textAlign: "center" }}
                    >
                      <Content
                        component="p"
                        style={{ fontSize: "clamp(0.4rem, 0.7vw, 1.1rem)" }}
                      >
                        {item.count} VMs
                      </Content>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </Flex>
      </FlexItem>
    </Flex>
  );
};

export default MigrationChart;

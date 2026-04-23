import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Icon,
} from "@patternfly/react-core";
import { DesktopIcon, InfoCircleIcon } from "@patternfly/react-icons";
import type React from "react";
import { chartColorFailure, chartColorSuccess } from "./constants";
import { dashboardStyles } from "./dashboardStyles";
import MigrationChart from "./MigrationChart";

interface OSDistributionProps {
  osData: {
    [osName: string]: {
      count: number;
      supported: boolean;
      upgradeRecommendation: string;
    };
  };
  isExportMode?: boolean;
}

export const OSDistribution: React.FC<OSDistributionProps> = ({
  osData,
  isExportMode = false,
}) => {
  const hasUpgradeRecommendation = Object.values(osData).some(
    (o) => o.upgradeRecommendation && o.upgradeRecommendation.trim() !== "",
  );

  const dataEntries = Object.entries(osData).filter(([os]) => os.trim() !== "");
  const osSortGroup = (osInfo: {
    count: number;
    supported: boolean;
    upgradeRecommendation: string;
  }): number => {
    if (osInfo.supported) return 1;
    if ((osInfo.upgradeRecommendation?.trim() ?? "") !== "") return 2;
    return 3;
  };

  const sorted = [...dataEntries].sort(([, a], [, b]) => {
    const groupA = osSortGroup(a);
    const groupB = osSortGroup(b);
    if (groupA !== groupB) return groupA - groupB;
    return b.count - a.count;
  });
  
  const chartData = sorted.map(([os, osInfo]) => ({
    name: os,
    count: osInfo.count,
    legendCategory: osInfo.supported
      ? "Supported by MTV"
      : "Not supported by MTV",
    infoText: osInfo.upgradeRecommendation,
  }));

  const customLegend = {
    "Supported by MTV": chartColorSuccess,
    "Not supported by MTV": chartColorFailure,
  };

  return (
    <Card
      className={
        isExportMode ? dashboardStyles.cardPrint : dashboardStyles.card
      }
      id="os-distribution"
    >
      <CardTitle>
        <DesktopIcon /> Operating Systems
      </CardTitle>
      <CardBody>
        {hasUpgradeRecommendation ? (
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            spaceItems={{ default: "spaceItemsSm" }}
          >
            <FlexItem>
              <Icon status="info">
                <InfoCircleIcon />
              </Icon>
            </FlexItem>
            <FlexItem>
              <Content component="p">
                <strong>OS must be upgraded to be supported</strong>
              </Content>
            </FlexItem>
          </Flex>
        ) : null}
        <MigrationChart
          data={chartData}
          legend={customLegend}
          maxHeight="350px"
          barHeight={12}
        />
      </CardBody>
    </Card>
  );
};

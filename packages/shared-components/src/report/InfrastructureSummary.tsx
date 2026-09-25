import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import type { FC } from "react";
import { ChartHeaderActions } from "./ChartDownloadButton.js";
import { ChartExportSurface } from "./ChartExportSurface.js";
import type { InfrastructureSummaryModel } from "./infrastructureSummaryModel.js";

export interface InfrastructureSummaryProps {
  summary: InfrastructureSummaryModel;
}

const formatCount = (value: number | undefined): string =>
  typeof value === "number" ? String(value) : "—";

const INFRA_CHART_ID = "infrastructure-summary";
const INFRA_TITLE = "Infrastructure summary";

export const InfrastructureSummary: FC<InfrastructureSummaryProps> = ({
  summary,
}) => (
  <Card isFullHeight id={INFRA_CHART_ID}>
    <CardTitle>
      <Flex
        justifyContent={{ default: "justifyContentSpaceBetween" }}
        alignItems={{ default: "alignItemsCenter" }}
      >
        <FlexItem>{INFRA_TITLE}</FlexItem>
        <ChartHeaderActions chartId={INFRA_CHART_ID} title={INFRA_TITLE} />
      </Flex>
    </CardTitle>
    <CardBody>
      <ChartExportSurface id={INFRA_CHART_ID} title={INFRA_TITLE}>
        <DescriptionList isAutoFit displaySize="lg">
          <DescriptionListGroup>
            <DescriptionListTerm>VMware version</DescriptionListTerm>
            <DescriptionListDescription>
              {summary.vmwareVersion}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Datacenters</DescriptionListTerm>
            <DescriptionListDescription>
              {formatCount(summary.datacenters)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>vCenters</DescriptionListTerm>
            <DescriptionListDescription>
              {formatCount(summary.vCenters)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>ESXi hosts</DescriptionListTerm>
            <DescriptionListDescription>
              {formatCount(summary.esxiHosts)}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </ChartExportSurface>
    </CardBody>
  </Card>
);

InfrastructureSummary.displayName = "InfrastructureSummary";

import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from "@patternfly/react-core";
import type { FC } from "react";
import type { InfrastructureSummaryModel } from "./infrastructureSummaryModel.js";

export interface InfrastructureSummaryProps {
  summary: InfrastructureSummaryModel;
}

const formatCount = (value: number | undefined): string =>
  typeof value === "number" ? String(value) : "—";

export const InfrastructureSummary: FC<InfrastructureSummaryProps> = ({
  summary,
}) => (
  <Card isFullHeight id="infrastructure-summary">
    <CardTitle>Infrastructure summary</CardTitle>
    <CardBody>
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
    </CardBody>
  </Card>
);

InfrastructureSummary.displayName = "InfrastructureSummary";

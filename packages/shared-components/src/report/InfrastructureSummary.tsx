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
import type { FC, ReactNode } from "react";
import type { InfrastructureSummaryModel } from "./infrastructureSummaryModel.js";

export interface InfrastructureSummaryProps {
  summary: InfrastructureSummaryModel;
  headerActions?: ReactNode;
}

const formatCount = (value: number | undefined): string =>
  typeof value === "number" ? String(value) : "—";

export const InfrastructureSummary: FC<InfrastructureSummaryProps> = ({
  summary,
  headerActions,
}) => (
  <Card isFullHeight id="infrastructure-summary">
    <CardTitle>
      {headerActions ? (
        <Flex
          justifyContent={{ default: "justifyContentSpaceBetween" }}
          alignItems={{ default: "alignItemsCenter" }}
        >
          <FlexItem>Infrastructure summary</FlexItem>
          <FlexItem>{headerActions}</FlexItem>
        </Flex>
      ) : (
        "Infrastructure summary"
      )}
    </CardTitle>
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

import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
  Label,
  LabelGroup,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { FC } from "react";
import { FeatureStatusBadge } from "./FeatureStatusBadge.js";
import type {
  ClusterDetailRow,
  ClusterDetailsModel,
  FeatureStatus,
} from "./infrastructureSummaryModel.js";

export interface VCenterClusterDetailsProps {
  isAggregateView: boolean;
  rows: ClusterDetailRow[];
  details?: ClusterDetailsModel;
  isExportMode?: boolean;
}

const clusterDetailsTableScrollStyle = css`
  max-height: 320px;
  overflow: auto;
`;

const FeatureList: FC<{
  items: { label: string; status: FeatureStatus }[];
}> = ({ items }) => (
  <DescriptionList isHorizontal isCompact>
    {items.map((item) => (
      <DescriptionListGroup key={item.label}>
        <DescriptionListTerm>{item.label}</DescriptionListTerm>
        <DescriptionListDescription>
          <FeatureStatusBadge status={item.status} />
        </DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

const AggregateClusterTable: FC<{
  rows: ClusterDetailRow[];
}> = ({ rows }) => (
  <Table
    variant="compact"
    borders={false}
    isStickyHeader
    data-testid="vcenter-cluster-details-table"
  >
    <Thead>
      <Tr>
        <Th>Cluster name</Th>
        <Th>Hosts</Th>
        <Th>VMs</Th>
        <Th>vMotion</Th>
        <Th>DRS</Th>
        <Th>vSAN</Th>
      </Tr>
    </Thead>
    <Tbody>
      {rows.map((row) => (
        <Tr key={row.id}>
          <Td dataLabel="Cluster name">{row.name}</Td>
          <Td dataLabel="Hosts">{row.hosts}</Td>
          <Td dataLabel="VMs">{row.vms}</Td>
          <Td dataLabel="vMotion">
            <FeatureStatusBadge status={row.vmotion} />
          </Td>
          <Td dataLabel="DRS">
            <FeatureStatusBadge status={row.drs} />
          </Td>
          <Td dataLabel="vSAN">
            <FeatureStatusBadge status={row.vsan} />
          </Td>
        </Tr>
      ))}
    </Tbody>
  </Table>
);

const AggregateCluster: FC<{
  rows: ClusterDetailRow[];
  isExportMode: boolean;
}> = ({ rows, isExportMode }) => {
  if (rows.length === 0) {
    return <Content component="p">No vSphere clusters detected</Content>;
  }

  return (
    <div
      className={isExportMode ? undefined : clusterDetailsTableScrollStyle}
      data-scroll-constrained={isExportMode ? undefined : "true"}
    >
      <AggregateClusterTable rows={rows} />
    </div>
  );
};

const DetailedClusterView: FC<{ details: ClusterDetailsModel }> = ({
  details,
}) => (
  <Grid hasGutter>
    <GridItem span={12}>
      <DescriptionList isAutoFit displaySize="lg">
        <DescriptionListGroup>
          <DescriptionListTerm>Hosts</DescriptionListTerm>
          <DescriptionListDescription>
            {details.hosts}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>VMs</DescriptionListTerm>
          <DescriptionListDescription>{details.vms}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Networks detected</DescriptionListTerm>
          <DescriptionListDescription>
            {details.networksDetected}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </GridItem>
    <GridItem md={4} span={12}>
      <Card isFullHeight>
        <CardTitle>Core infrastructure</CardTitle>
        <CardBody>
          <FeatureList
            items={[
              { label: "vMotion", status: details.vmotion },
              { label: "DRS", status: details.drs },
              { label: "HA", status: details.ha },
            ]}
          />
        </CardBody>
      </Card>
    </GridItem>
    <GridItem md={4} span={12}>
      <Card isFullHeight>
        <CardTitle>vSAN capabilities</CardTitle>
        <CardBody>
          <FeatureList items={[{ label: "vSAN", status: details.vsan }]} />
        </CardBody>
      </Card>
    </GridItem>
    <GridItem md={4} span={12}>
      <Card isFullHeight>
        <CardTitle>Network topology</CardTitle>
        <CardBody>
          {details.networks.length === 0 ? (
            <Content component="p">No networks detected</Content>
          ) : (
            <>
              <Content component="p">
                {details.networksDetected}{" "}
                {details.networksDetected === 1
                  ? "network detected"
                  : "networks detected"}
              </Content>
              <LabelGroup
                isCompact
                numLabels={details.networks.length}
                aria-label="Detected networks"
              >
                {details.networks.map((network, index) => (
                  <Label
                    key={`${network.name}-${network.vlanId ?? index}`}
                    color="blue"
                    isCompact
                  >
                    {network.displayName}
                  </Label>
                ))}
              </LabelGroup>
            </>
          )}
        </CardBody>
      </Card>
    </GridItem>
  </Grid>
);

export const VCenterClusterDetails: FC<VCenterClusterDetailsProps> = ({
  isAggregateView,
  rows,
  details,
  isExportMode = false,
}) => (
  <Card isFullHeight id="vcenter-cluster-details">
    <CardTitle>vCenter cluster details</CardTitle>
    <CardBody>
      {isAggregateView || !details ? (
        <AggregateCluster rows={rows} isExportMode={isExportMode} />
      ) : (
        <DetailedClusterView details={details} />
      )}
    </CardBody>
  </Card>
);

VCenterClusterDetails.displayName = "VCenterClusterDetails";

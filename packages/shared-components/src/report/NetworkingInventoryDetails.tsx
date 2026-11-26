import { css } from "@emotion/css";
import {
  Card,
  CardBody,
  Content,
  Pagination,
  SearchInput,
  Title,
} from "@patternfly/react-core";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { CardEmptyState } from "./CardEmptyState.js";
import { REPORT_CARD_EMPTY_STATE_TITLES } from "./constants.js";
import {
  buildNetworkingInventorySummary,
  buildNetworkingInventoryTableRows,
  filterNetworkingRowsBySearch,
  type InventoryNetworkRowLike,
} from "./networkingInventoryModel.js";

const DEFAULT_PAGE_SIZE = 10;

const subtitleStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  max-width: 52rem;
  margin-top: var(--pf-t--global--spacer--sm);
`;

const metricsRow = css`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--pf-t--global--spacer--gap--group--horizontal);
  margin-top: var(--pf-t--global--spacer--xl);
  padding-bottom: var(--pf-t--global--spacer--md);

  @media (max-width: 992px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const metricTile = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 4.5rem;
`;

const metricValue = css`
  font-size: var(--pf-t--global--font--size--2xl);
  font-weight: var(--pf-t--global--font--weight--heading--bold);
  line-height: var(--pf-t--global--font--line-height--heading);
`;

const metricLabel = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: var(--pf-t--global--font--size--body--default);
  margin-top: var(--pf-t--global--spacer--xs);
`;

const networkingCardBody = css`
  display: flex;
  flex-direction: column;
  gap: var(--pf-t--global--spacer--gap--group--vertical);
`;

const tableToolbar = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pf-t--global--spacer--gap--group--horizontal);
  flex-wrap: wrap;
  padding-top: var(--pf-t--global--spacer--md);
  border-top: 1px solid var(--pf-t--global--border--color--default);
`;

const searchField = css`
  min-width: 16rem;
  width: min(100%, 20rem);
`;

const numericCell = css`
  text-align: right;
`;

const networksTable = css`
  && tbody td {
    border-block-end: 1px solid var(--pf-t--global--border--color--default);
  }
`;

export interface NetworkingInventoryDetailsProps {
  networks?: InventoryNetworkRowLike[];
  /** Human-readable scope for the Scope column (e.g. "Entire environment"). */
  scopeLabel: string;
}

const SummaryMetricTile: FC<{ value: number; label: string }> = ({
  value,
  label,
}) => (
  <div className={metricTile}>
    <Content className={metricLabel} component="p">
      {label}
    </Content>
    <div className={metricValue}>{value}</div>
  </div>
);

SummaryMetricTile.displayName = "SummaryMetricTile";

export const NetworkingInventoryDetails: FC<
  NetworkingInventoryDetailsProps
> = ({ networks, scopeLabel }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const summary = useMemo(
    () => buildNetworkingInventorySummary(networks),
    [networks],
  );

  const allRows = useMemo(
    () => buildNetworkingInventoryTableRows(networks, scopeLabel),
    [networks, scopeLabel],
  );

  const filteredRows = useMemo(
    () => filterNetworkingRowsBySearch(allRows, search),
    [allRows, search],
  );

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredRows.length / perPage) || 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredRows.length, page, perPage]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, page, perPage]);

  const hasNetworks = allRows.length > 0;

  if (!hasNetworks) {
    return <CardEmptyState title={REPORT_CARD_EMPTY_STATE_TITLES.networks} />;
  }

  return (
    <Card>
      <CardBody className={networkingCardBody}>
        <div>
          <Title headingLevel="h2" size="xl">
            Networking
          </Title>
          <Content className={subtitleStyle} component="p">
            Networks in the selected scope. VM counts are network memberships; a
            VM can connect to more than one network.
          </Content>
        </div>

        <div className={metricsRow}>
          <SummaryMetricTile value={summary.networks} label="Networks" />
          <SummaryMetricTile
            value={summary.vlansAndRanges}
            label="VLANs and ranges"
          />
          <SummaryMetricTile
            value={summary.distributedNetworks}
            label="Distributed networks"
          />
          <SummaryMetricTile
            value={summary.standardNetworks}
            label="Standard networks"
          />
        </div>

        <div className={tableToolbar}>
          <SearchInput
            className={searchField}
            placeholder="Search networks"
            value={search}
            onChange={(_event, value) => {
              setSearch(value);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setPage(1);
            }}
            aria-label="Search networks"
          />
          <Pagination
            itemCount={filteredRows.length}
            perPage={perPage}
            page={page}
            onSetPage={(_event, newPage) => setPage(newPage)}
            onPerPageSelect={(_event, newPerPage) => {
              setPage(1);
              setPerPage(newPerPage);
            }}
            variant="top"
            isCompact
          />
        </div>

        <Table
          aria-label="Networks inventory"
          borders={false}
          className={networksTable}
        >
          <Thead>
            <Tr>
              <Th>Network</Th>
              <Th>Type</Th>
              <Th>VLAN</Th>
              <Th className={numericCell}>Connected VMs</Th>
              <Th>Distributed switch</Th>
              <Th>Scope</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pageRows.map((row) => (
              <Tr key={row.id}>
                <Td>{row.name}</Td>
                <Td>{row.typeLabel}</Td>
                <Td>{row.vlanLabel}</Td>
                <Td className={numericCell}>{row.connectedVmsLabel}</Td>
                <Td>{row.distributedSwitchLabel}</Td>
                <Td>{row.scopeLabel}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </CardBody>
    </Card>
  );
};

NetworkingInventoryDetails.displayName = "NetworkingInventoryDetails";

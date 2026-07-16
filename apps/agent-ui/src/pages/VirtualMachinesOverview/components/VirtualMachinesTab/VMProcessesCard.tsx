import type { Process } from "@openshift-migration-advisor/agent-sdk";
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Pagination,
  SearchInput,
} from "@patternfly/react-core";
import { ProcessAutomationIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useMemo } from "react";
import { VmDetailListSearchEmptyState } from "./VmDetailListSearchEmptyState";
import {
  assignStableRowKeys,
  useVmDetailListCardState,
} from "./vmDetailListCard";

interface VMProcessesCardProps {
  processes: Process[];
}

const getProcessName = (process: Process) => process.name;

const getProcessRowKey = (process: Process) =>
  `${process.name}\0${process.version ?? ""}`;

export const VMProcessesCard: React.FC<VMProcessesCardProps> = ({
  processes,
}) => {
  const getSearchValue = useCallback(getProcessName, []);
  const {
    nameSearch,
    page,
    pageSize,
    filteredItems,
    paginatedItems,
    handleNameSearch,
    setPage,
    handlePerPageSelect,
  } = useVmDetailListCardState(processes, getSearchValue, 10);

  const paginatedRows = useMemo(
    () => assignStableRowKeys(paginatedItems, getProcessRowKey),
    [paginatedItems],
  );

  return (
    <Card>
      <CardTitle>
        <ProcessAutomationIcon /> Processes ({processes.length})
      </CardTitle>
      <CardBody>
        {processes.length === 0 ? (
          <span
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            No processes were detected on this virtual machine.
          </span>
        ) : (
          <>
            <Flex
              alignItems={{ default: "alignItemsCenter" }}
              gap={{ default: "gapMd" }}
              style={{ marginBottom: "16px" }}
            >
              <FlexItem flex={{ default: "flex_1" }}>
                <SearchInput
                  placeholder="Filter by process name"
                  value={nameSearch}
                  onChange={(_event, value) => handleNameSearch(value)}
                  onClear={() => handleNameSearch("")}
                  style={{ width: "100%" }}
                />
              </FlexItem>
              <FlexItem>
                <Pagination
                  itemCount={filteredItems.length}
                  perPage={pageSize}
                  page={page}
                  onSetPage={(_event, newPage) => setPage(newPage)}
                  onPerPageSelect={(_event, newPerPage) => {
                    handlePerPageSelect(newPerPage);
                  }}
                  variant="top"
                  isCompact
                />
              </FlexItem>
            </Flex>
            <Table aria-label="Detected processes" variant="compact">
              <Thead>
                <Tr>
                  <Th>Process</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredItems.length === 0 ? (
                  <Tr>
                    <Td colSpan={1}>
                      <VmDetailListSearchEmptyState titleText="No processes match your search input" />
                    </Td>
                  </Tr>
                ) : (
                  paginatedRows.map(({ item: process, rowKey }) => (
                    <Tr key={rowKey}>
                      <Td>{process.name}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </>
        )}
      </CardBody>
    </Card>
  );
};

VMProcessesCard.displayName = "VMProcessesCard";

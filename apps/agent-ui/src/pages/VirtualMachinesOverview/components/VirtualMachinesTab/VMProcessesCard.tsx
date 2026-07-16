import { css } from "@emotion/css";
import type { Process } from "@openshift-migration-advisor/agent-sdk";
import { Card, CardBody, CardTitle } from "@patternfly/react-core";
import { ProcessAutomationIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useMemo } from "react";
import { VmDetailListCardToolbar } from "./VmDetailListCardToolbar";
import { VmDetailListSearchEmptyState } from "./VmDetailListSearchEmptyState";
import {
  assignStableRowKeys,
  useVmDetailListCardState,
} from "./vmDetailListCard";

const styles = {
  subtleText: css`
    color: var(--pf-t--global--text--color--subtle);
  `,
};

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
          <span className={styles.subtleText}>
            No processes were detected on this virtual machine.
          </span>
        ) : (
          <>
            <VmDetailListCardToolbar
              searchPlaceholder="Filter by process name"
              nameSearch={nameSearch}
              onNameSearch={handleNameSearch}
              itemCount={filteredItems.length}
              page={page}
              pageSize={pageSize}
              onSetPage={setPage}
              onPerPageSelect={handlePerPageSelect}
            />
            <Table aria-label="Detected processes" variant="compact">
              {filteredItems.length > 0 && (
                <Thead>
                  <Tr>
                    <Th>Process</Th>
                  </Tr>
                </Thead>
              )}
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

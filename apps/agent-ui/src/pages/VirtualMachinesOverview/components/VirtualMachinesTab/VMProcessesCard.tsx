import { Card, CardBody, CardTitle } from "@patternfly/react-core";
import { ProcessAutomationIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback, useMemo } from "react";
import { AppEmptyState } from "../../../../common/components";
import { VmDetailListCardToolbar } from "./VmDetailListCardToolbar";
import { VmDetailListSearchEmptyState } from "./VmDetailListSearchEmptyState";
import {
  assignStableRowKeys,
  useVmDetailListCardState,
} from "./vmDetailListCard";

/** Local stand-in for removed SDK Process type (v2 detail model has no processes). */
export type DetectedProcess = {
  name: string;
  version?: string;
};

interface VMProcessesCardProps {
  processes: DetectedProcess[];
}

const getProcessName = (process: DetectedProcess) => process.name;

const getProcessRowKey = (process: DetectedProcess) =>
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
          <AppEmptyState
            titleText="No processes were detected on this virtual machine"
            body="Processes are identified during virtual machine inspection."
            icon={ProcessAutomationIcon}
            bullseyeStyle={{ padding: "16px 0" }}
          />
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

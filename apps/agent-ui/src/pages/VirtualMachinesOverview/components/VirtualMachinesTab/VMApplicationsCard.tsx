import { css } from "@emotion/css";
import type { ApplicationOverview } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Pagination,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback } from "react";
import { getApplicationVendor } from "../ApplicationsTab/applicationVendor";
import { VmDetailListSearchEmptyState } from "./VmDetailListSearchEmptyState";
import { useVmDetailListCardState } from "./vmDetailListCard";

export const VM_APPLICATIONS_SECTION_ID = "vm-applications-section";

const styles = {
  loading: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  subtleText: css`
    color: var(--pf-t--global--text--color--subtle);
  `,
  toolbar: css`
    flex-direction: row;
    align-items: center;
  `,
  searchInput: css`
    width: 100%;
  `,
};

interface VMApplicationsCardProps {
  applications: ApplicationOverview[];
  loading: boolean;
  error: string | null;
}

export const VMApplicationsCard: React.FC<VMApplicationsCardProps> = ({
  applications,
  loading,
  error,
}) => {
  const getSearchValue = useCallback(
    (application: ApplicationOverview) => application.name,
    [],
  );
  const {
    nameSearch,
    page,
    pageSize,
    filteredItems,
    paginatedItems,
    handleNameSearch,
    setPage,
    handlePerPageSelect,
  } = useVmDetailListCardState(applications, getSearchValue, 10);

  return (
    <Card id={VM_APPLICATIONS_SECTION_ID}>
      <CardTitle>
        <CubesIcon /> Applications ({applications.length})
      </CardTitle>
      <CardBody>
        {error ? (
          <Alert
            variant="warning"
            isInline
            isPlain
            title="Applications unavailable"
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className={styles.loading}>
            <Spinner size="md" />
            <span>Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <span className={styles.subtleText}>
            No applications were detected on this virtual machine.
          </span>
        ) : (
          <Stack hasGutter>
            <StackItem>
              <Stack hasGutter className={styles.toolbar}>
                <StackItem isFilled>
                  <SearchInput
                    placeholder="Filter by application name"
                    value={nameSearch}
                    onChange={(_event, value) => handleNameSearch(value)}
                    onClear={() => handleNameSearch("")}
                    className={styles.searchInput}
                  />
                </StackItem>
                <StackItem>
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
                </StackItem>
              </Stack>
            </StackItem>
            <StackItem isFilled>
              <Table aria-label="Detected applications" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Application</Th>
                    <Th>Vendor</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredItems.length === 0 ? (
                    <Tr>
                      <Td colSpan={2}>
                        <VmDetailListSearchEmptyState titleText="No applications match your search input" />
                      </Td>
                    </Tr>
                  ) : (
                    paginatedItems.map((application) => (
                      <Tr key={application.name}>
                        <Td>{application.name}</Td>
                        <Td>{getApplicationVendor(application.name)}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </StackItem>
          </Stack>
        )}
      </CardBody>
    </Card>
  );
};

VMApplicationsCard.displayName = "VMApplicationsCard";

import type { ApplicationOverview } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Pagination,
  SearchInput,
  Spinner,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback } from "react";
import { getApplicationVendor } from "../ApplicationsTab/applicationVendor";
import { useVmDetailListCardState } from "./vmDetailListCard";

export const VM_APPLICATIONS_SECTION_ID = "vm-applications-section";

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
      <CardBody>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            fontWeight: 600,
          }}
        >
          <CubesIcon />
          Applications ({applications.length})
        </div>

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Spinner size="md" />
            <span>Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <span
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
            }}
          >
            No applications were detected on this virtual machine.
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
                  placeholder="Filter by application name"
                  value={nameSearch}
                  onChange={(_event, value) => handleNameSearch(value)}
                  onClear={() => handleNameSearch("")}
                  style={{ width: "100%" }}
                />
              </FlexItem>
              {filteredItems.length > 0 && (
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
              )}
            </Flex>
            {filteredItems.length === 0 ? (
              <span
                style={{
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                No applications match your search.
              </span>
            ) : (
              <Table aria-label="Detected applications" variant="compact">
                <Thead>
                  <Tr>
                    <Th>Application</Th>
                    <Th>Vendor</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedItems.map((application) => (
                    <Tr key={application.name}>
                      <Td>{application.name}</Td>
                      <Td>{getApplicationVendor(application.name)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

VMApplicationsCard.displayName = "VMApplicationsCard";

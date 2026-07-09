import type { ApplicationOverview } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  ExpandableSection,
  Pagination,
  SearchInput,
  Spinner,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useMemo, useState } from "react";
import { TechnologyPreviewBadge } from "../../../../common/components/TechnologyPreviewBadge";
import {
  filterApplications,
  paginateItems,
} from "../ApplicationsTab/applicationFilters";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredApplications = useMemo(
    () =>
      filterApplications(applications, {
        nameSearch,
        vmIds: [],
      }),
    [applications, nameSearch],
  );

  const paginatedApplications = useMemo(
    () => paginateItems(filteredApplications, page, pageSize),
    [filteredApplications, page, pageSize],
  );

  const handleNameSearch = (value: string) => {
    setNameSearch(value);
    setPage(1);
  };

  return (
    <Card>
      <CardTitle>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CubesIcon /> Applications
          <TechnologyPreviewBadge />
        </span>
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
          <ExpandableSection
            toggleContent={`Detected applications (${applications.length})`}
            isExpanded={isExpanded}
            onToggle={(_event, expanded) => setIsExpanded(expanded)}
          >
            <SearchInput
              placeholder="Find by application name"
              value={nameSearch}
              onChange={(_event, value) => handleNameSearch(value)}
              onClear={() => handleNameSearch("")}
              style={{ marginBottom: "16px", maxWidth: "360px" }}
            />
            {filteredApplications.length === 0 ? (
              <span
                style={{
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                No applications match your search.
              </span>
            ) : (
              <>
                <Pagination
                  itemCount={filteredApplications.length}
                  perPage={pageSize}
                  page={page}
                  onSetPage={(_event, newPage) => setPage(newPage)}
                  onPerPageSelect={(_event, newPerPage) => {
                    setPage(1);
                    setPageSize(newPerPage);
                  }}
                  variant="top"
                  isCompact
                  style={{ marginBottom: "16px" }}
                />
                <Table
                  aria-label="Detected applications"
                  variant="compact"
                  borders={false}
                >
                  <Thead>
                    <Tr>
                      <Th>Application name</Th>
                      <Th>Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paginatedApplications.map((application) => (
                      <Tr key={application.name}>
                        <Td>{application.name}</Td>
                        <Td>{application.description || "—"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </>
            )}
          </ExpandableSection>
        )}
      </CardBody>
    </Card>
  );
};

VMApplicationsCard.displayName = "VMApplicationsCard";

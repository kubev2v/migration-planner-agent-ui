import { css } from "@emotion/css";
import type { ApplicationOverview } from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Spinner,
} from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type React from "react";
import { useCallback } from "react";
import { AppEmptyState } from "../../../../common/components";
import { getApplicationVendor } from "../ApplicationsTab/applicationVendor";
import { VmDetailListCardToolbar } from "./VmDetailListCardToolbar";
import { VmDetailListSearchEmptyState } from "./VmDetailListSearchEmptyState";
import { useVmDetailListCardState } from "./vmDetailListCard";

export const VM_APPLICATIONS_SECTION_ID = "vm-applications-section";

const styles = {
  loading: css`
    display: flex;
    align-items: center;
    gap: 8px;
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
          <AppEmptyState
            titleText="No applications were detected on this virtual machine"
            body="Applications are identified during virtual machine inspection."
            icon={CubesIcon}
            bullseyeStyle={{ padding: "16px 0" }}
          />
        ) : (
          <>
            <VmDetailListCardToolbar
              searchPlaceholder="Filter by application name"
              nameSearch={nameSearch}
              onNameSearch={handleNameSearch}
              itemCount={filteredItems.length}
              page={page}
              pageSize={pageSize}
              onSetPage={setPage}
              onPerPageSelect={handlePerPageSelect}
            />
            <Table aria-label="Detected applications" variant="compact">
              {filteredItems.length > 0 && (
                <Thead>
                  <Tr>
                    <Th>Application</Th>
                    <Th>Vendor</Th>
                  </Tr>
                </Thead>
              )}
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
          </>
        )}
      </CardBody>
    </Card>
  );
};

VMApplicationsCard.displayName = "VMApplicationsCard";

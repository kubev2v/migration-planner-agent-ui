import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Alert,
  Button,
  Content,
  Form,
  FormAlert,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiError } from "../../../../common/parseApiError";
import { Symbols } from "../../../../main/Symbols";
import { VMTable } from "../../../VirtualMachinesOverview/components/VirtualMachinesTab/VMTable";
import { fetchVmTableFilterOptions } from "../../../VirtualMachinesOverview/components/VirtualMachinesTab/vmFilterOptions";
import {
  filtersToByExpression,
  type VMFilters,
  withDefaultReportInclusion,
} from "../../../VirtualMachinesOverview/components/VirtualMachinesTab/vmFilters";
import { fetchAllMatchingVmIds } from "../../../VirtualMachinesOverview/components/VirtualMachinesTab/vmSelection";
import { vmIdsToFilterExpression } from "../../utils/groupFilters";
import { invalidateAllGroupsCache } from "../../utils/groupList";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const agentApi = useInjection<DefaultApiInterface>(Symbols.AgentApi);
  const [name, setName] = useState("");
  const [vms, setVms] = useState<VirtualMachine[]>([]);
  const [totalVMs, setTotalVMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVMs, setSelectedVMs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<VMFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortFields, setSortFields] = useState<string[]>([]);
  const [availableFilterOptions, setAvailableFilterOptions] = useState({
    clusters: [] as string[],
    datacenters: [] as string[],
    concernLabels: [] as string[],
    concernCategories: [] as string[],
    vmLabels: [] as string[],
    groups: [] as string[],
    applications: [] as string[],
  });
  const requestIdRef = useRef(0);

  const resetState = useCallback(() => {
    setName("");
    setSelectedVMs(new Set());
    setFilters({});
    setPage(1);
    setPageSize(20);
    setSortFields([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    resetState();

    const fetchFilterOptions = async () => {
      try {
        setAvailableFilterOptions(await fetchVmTableFilterOptions(agentApi));
      } catch (err) {
        console.error("Error fetching VM filter options:", err);
      }
    };

    fetchFilterOptions();
  }, [isOpen, agentApi, resetState]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchVMs = async () => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      try {
        setLoading(true);
        const byExpression = filtersToByExpression(
          withDefaultReportInclusion(filters),
        );

        const response = await agentApi.getVMs({
          byExpression,
          sort: sortFields.length > 0 ? sortFields : undefined,
          page,
          pageSize,
        });

        if (requestId === requestIdRef.current) {
          setVms(response.vms || []);
          setTotalVMs(response.total || 0);
        }
      } catch (err) {
        console.error("Error fetching VMs for group creation:", err);
        if (requestId === requestIdRef.current) {
          setVms([]);
          setTotalVMs(0);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchVMs();
  }, [isOpen, agentApi, filters, page, pageSize, sortFields]);

  const handleFetchAllVmIds = useCallback(
    async (tableFilters: VMFilters) => {
      const byExpression = filtersToByExpression(
        withDefaultReportInclusion(tableFilters),
      );
      return fetchAllMatchingVmIds(agentApi, {
        byExpression,
        sort: sortFields.length > 0 ? sortFields : undefined,
      });
    },
    [agentApi, sortFields],
  );

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Group name is required.");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await agentApi.createGroup({
        createGroupRequest: {
          name: trimmed,
          filter: vmIdsToFilterExpression(Array.from(selectedVMs)),
        },
      });
      invalidateAllGroupsCache(agentApi);
      onCreated();
      onClose();
    } catch (err) {
      setError(await parseApiError(err, "Failed to create group."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
      width="min(1200px, 95vw)"
      aria-labelledby="create-group-title"
    >
      <ModalHeader title="Create VM group" labelId="create-group-title" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              Create virtual machine groups to generate targeted assessment
              reports and enhanced VM management. Name the group and choose
              virtual machines to include in it.
            </Content>
          </StackItem>
          {error && (
            <StackItem>
              <FormAlert>
                <Alert
                  variant="danger"
                  title={error}
                  aria-live="polite"
                  isInline
                />
              </FormAlert>
            </StackItem>
          )}
          <StackItem>
            <Form
              id="create-group-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <FormGroup
                label="Group name"
                isRequired
                fieldId="create-group-name"
              >
                <TextInput
                  id="create-group-name"
                  value={name}
                  onChange={(_event, value) => setName(value)}
                  validated={error && !name.trim() ? "error" : "default"}
                />
              </FormGroup>
            </Form>
          </StackItem>
          <StackItem>
            <VMTable
              variant="compact"
              vms={vms}
              loading={loading}
              initialFilters={filters}
              totalVMs={totalVMs}
              currentPage={page}
              pageSize={pageSize}
              onFiltersChange={(nextFilters) => {
                setFilters(nextFilters);
                setPage(1);
              }}
              onPageChange={(nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              }}
              onSortChange={setSortFields}
              availableFilterOptions={availableFilterOptions}
              selectedVMs={selectedVMs}
              onSelectionChange={setSelectedVMs}
              onFetchAllVmIds={handleFetchAllVmIds}
            />
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="create-group-form"
          isLoading={isCreating}
          isDisabled={isCreating || !name.trim()}
        >
          Create
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isCreating}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

CreateGroupModal.displayName = "CreateGroupModal";

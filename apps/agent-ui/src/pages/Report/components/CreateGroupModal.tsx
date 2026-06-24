import { useInjection } from "@migration-planner-ui/ioc";
import type {
  DefaultApiInterface,
  VirtualMachine,
} from "@openshift-migration-advisor/agent-sdk";
import {
  Button,
  Content,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "@patternfly/react-core";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Symbols } from "../../../main/Symbols";
import { vmIdsToFilterExpression } from "./groupFilters";
import { invalidateAllGroupsCache } from "./groupList";
import { VMTable } from "./VMTable";
import { fetchVmTableFilterOptions } from "./vmFilterOptions";
import { filtersToByExpression, type VMFilters } from "./vmFilters";
import { fetchAllMatchingVmIds } from "./vmSelection";

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
  const [showExcludedVMs, setShowExcludedVMs] = useState(true);
  const [availableFilterOptions, setAvailableFilterOptions] = useState({
    clusters: [] as string[],
    datacenters: [] as string[],
    concernLabels: [] as string[],
    concernCategories: [] as string[],
    vmLabels: [] as string[],
    groups: [] as string[],
  });
  const requestIdRef = useRef(0);

  const resetState = useCallback(() => {
    setName("");
    setSelectedVMs(new Set());
    setFilters({});
    setPage(1);
    setPageSize(20);
    setSortFields([]);
    setShowExcludedVMs(true);
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
        const effectiveFilters = { ...filters, showExcludedVMs };
        const byExpression = filtersToByExpression(effectiveFilters);

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
  }, [isOpen, agentApi, filters, showExcludedVMs, page, pageSize, sortFields]);

  const handleFetchAllVmIds = useCallback(
    async (tableFilters: VMFilters) => {
      const effectiveFilters = { ...tableFilters, showExcludedVMs };
      const byExpression = filtersToByExpression(effectiveFilters);
      return fetchAllMatchingVmIds(agentApi, {
        byExpression,
        sort: sortFields.length > 0 ? sortFields : undefined,
      });
    },
    [agentApi, showExcludedVMs, sortFields],
  );

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Group name is required.");
      return;
    }
    if (selectedVMs.size === 0) {
      setError("Select at least one virtual machine.");
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
      setError(err instanceof Error ? err.message : "Failed to create group.");
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
        <Content component="p" style={{ marginBottom: "16px" }}>
          Create virtual machine groups to generate targeted assessment reports
          and enhanced VM management. Name the group and choose virtual machines
          to include in it.
        </Content>
        <Form style={{ marginBottom: "24px" }}>
          <FormGroup label="Group name" isRequired fieldId="create-group-name">
            <TextInput
              id="create-group-name"
              value={name}
              onChange={(_event, value) => setName(value)}
              validated={error && !name.trim() ? "error" : "default"}
            />
          </FormGroup>
        </Form>
        {error && (
          <Content
            component="p"
            style={{
              color:
                "var(--pf-t--global--text--color--status--danger--default)",
              marginBottom: "16px",
            }}
          >
            {error}
          </Content>
        )}
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
          showExcludedVMs={showExcludedVMs}
          onShowExcludedVMsChange={(show) => {
            setShowExcludedVMs(show);
            setPage(1);
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleCreate}
          isLoading={isCreating}
          isDisabled={isCreating || !name.trim() || selectedVMs.size === 0}
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

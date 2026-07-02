import { css } from "@emotion/css";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Divider,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_EXPORT_SCOPES,
  EXPORT_SCOPE_OPTIONS,
  type ExportScopeId,
} from "./exportScopes";

const scopeDescriptionStyle = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: var(--pf-t--global--font--size--sm);
  font-weight: var(--pf-t--global--font--weight--body--default);
`;

const scopeLabelStyle = css`
  font-weight: var(--pf-t--global--font--weight--body--bold);
`;

const scopeListStyle = css`
  max-height: min(50vh, 24rem);
  overflow-y: auto;
  padding-right: var(--pf-t--global--spacer--sm);
`;

interface ExportCsvModalProps {
  isOpen: boolean;
  error?: string | null;
  isExporting?: boolean;
  onClose: () => void;
  onExport: (scopes: ExportScopeId[]) => void | Promise<void>;
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  error = null,
  isExporting = false,
  onClose,
  onExport,
}) => {
  const [selectedScopes, setSelectedScopes] = useState<ExportScopeId[]>(
    DEFAULT_EXPORT_SCOPES,
  );

  const allScopeIds = useMemo(
    () => EXPORT_SCOPE_OPTIONS.map((option) => option.id),
    [],
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedScopes(DEFAULT_EXPORT_SCOPES);
    }
  }, [isOpen]);

  const selectedCount = selectedScopes.length;
  const allSelected = selectedCount === allScopeIds.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const selectAllChecked = allSelected ? true : someSelected ? null : false;

  const toggleScope = (scopeId: ExportScopeId, checked: boolean) => {
    setSelectedScopes((current) => {
      if (checked) {
        return current.includes(scopeId) ? current : [...current, scopeId];
      }
      return current.filter((scope) => scope !== scopeId);
    });
  };

  const handleSelectAllChange = (
    _event: React.FormEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setSelectedScopes(checked ? [...allScopeIds] : []);
  };

  const handleExport = () => {
    if (isExporting) {
      return;
    }

    void onExport(selectedScopes);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="export-csv-modal-title"
      aria-describedby="export-csv-modal-body"
      variant="medium"
    >
      <ModalHeader title="Export as CSV" labelId="export-csv-modal-title" />
      <ModalBody id="export-csv-modal-body">
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert variant="danger" title="Export failed" isInline>
                {error}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <Content component="p">
              Select the data you want to include in your CSV export.
            </Content>
          </StackItem>
          <StackItem>
            <Checkbox
              id="export-scope-select-all"
              label="Select all"
              isChecked={selectAllChecked}
              onChange={handleSelectAllChange}
            />
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
          <StackItem className={scopeListStyle}>
            <Stack hasGutter>
              {EXPORT_SCOPE_OPTIONS.map((option) => (
                <StackItem key={option.id}>
                  <Checkbox
                    id={`export-scope-${option.id}`}
                    label={
                      <div>
                        <div className={scopeLabelStyle}>{option.label}</div>
                        {option.description ? (
                          <div className={scopeDescriptionStyle}>
                            {option.description}
                          </div>
                        ) : null}
                      </div>
                    }
                    isChecked={selectedScopes.includes(option.id)}
                    onChange={(_event, checked) =>
                      toggleScope(option.id, checked)
                    }
                  />
                </StackItem>
              ))}
            </Stack>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleExport}
          isDisabled={selectedScopes.length === 0 || isExporting}
        >
          Export ({selectedScopes.length})
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

ExportCsvModal.displayName = "ExportCsvModal";

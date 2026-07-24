import { css } from "@emotion/css";
import {
  Alert,
  Button,
  Checkbox,
  Content,
  Divider,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_EXPORT_FORMAT,
  DEFAULT_EXPORT_SCOPES,
  EXPORT_SCOPE_OPTIONS,
  type ExportFormat,
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

const formatOptionsStyle = css`
  display: flex;
  flex-direction: column;
  gap: var(--pf-t--global--spacer--sm);
`;

interface ExportCsvModalProps {
  isOpen: boolean;
  error?: string | null;
  isExporting?: boolean;
  onClose: () => void;
  onExport: (
    scopes: ExportScopeId[],
    format: ExportFormat,
  ) => void | Promise<void>;
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
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    DEFAULT_EXPORT_FORMAT,
  );

  const allScopeIds = useMemo(
    () => EXPORT_SCOPE_OPTIONS.map((option) => option.id),
    [],
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedScopes(DEFAULT_EXPORT_SCOPES);
      setSelectedFormat(DEFAULT_EXPORT_FORMAT);
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

    void onExport(selectedScopes, selectedFormat);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="export-modal-title"
      aria-describedby="export-modal-body"
      variant="medium"
    >
      <ModalHeader title="Export" labelId="export-modal-title" />
      <ModalBody id="export-modal-body">
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert variant="danger" title="Export failed" isInline>
                {error}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <FormGroup label="Format" isRequired fieldId="export-format-xlsx">
              <div
                className={formatOptionsStyle}
                role="radiogroup"
                aria-label="Export format"
              >
                <Radio
                  id="export-format-xlsx"
                  name="export-format"
                  label={
                    <div>
                      <div className={scopeLabelStyle}>Excel (.xlsx)</div>
                      <div className={scopeDescriptionStyle}>
                        One workbook with a sheet per selected scope
                      </div>
                    </div>
                  }
                  isChecked={selectedFormat === "xlsx"}
                  onChange={() => setSelectedFormat("xlsx")}
                />
                <Radio
                  id="export-format-zip"
                  name="export-format"
                  label={
                    <div>
                      <div className={scopeLabelStyle}>ZIP (CSV files)</div>
                      <div className={scopeDescriptionStyle}>
                        CSV files packaged in a ZIP archive
                      </div>
                    </div>
                  }
                  isChecked={selectedFormat === "zip"}
                  onChange={() => setSelectedFormat("zip")}
                />
              </div>
            </FormGroup>
          </StackItem>
          <StackItem>
            <Content component="p">
              Select the data you want to include in your export.
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

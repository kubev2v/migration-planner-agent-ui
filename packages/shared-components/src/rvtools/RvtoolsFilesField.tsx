import {
  Button,
  ExpandableSection,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
  Truncate,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  FileIcon,
  InProgressIcon,
  RhUiTrashIcon,
  RhUiUploadIcon,
} from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";
import type { FC } from "react";
import { useRef, useState } from "react";

import {
  MAX_RVTOOLS_FILES,
  RVTOOLS_ACCEPT,
  RVTOOLS_FILE_REQUIREMENTS_URL,
} from "./constants.js";
import { formatRvtoolsFileSize } from "./formatters.js";
import {
  dropzoneIntroStyle,
  dropzoneStyle,
  dropzoneTextStyle,
  hiddenInputStyle,
  reviewTableActionsStyle,
  reviewTableStyle,
  stagedFileActionsStyle,
  stagedFileCompleteIconStyle,
  stagedFileMetaStyle,
  stagedFileNameStyle,
  stagedFilePercentStyle,
  stagedFileProgressStyle,
  stagedFileRowStyle,
  stagedFilesListStyle,
  stagedFilesPanelStyle,
  stagedFilesToolbarIconStyle,
  stagedFilesToolbarToggleStyle,
} from "./styles.js";
import type { RvtoolsFilesFieldMode, RvtoolsStagedFile } from "./types.js";

export type RvtoolsFilesFieldProps = {
  mode: RvtoolsFilesFieldMode;
  isDisabled?: boolean;
  stagedFiles: RvtoolsStagedFile[];
  filePickerError?: string;
  showReviewTable: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onReplaceFile: (id: string, file: File) => void;
  partialAssessmentNotice?: React.ReactNode;
  fileRequirementsUrl?: string;
  maxFiles?: number;
  fieldId?: string;
  introText?: React.ReactNode;
};

export const RvtoolsFilesField: FC<RvtoolsFilesFieldProps> = ({
  mode,
  isDisabled = false,
  stagedFiles,
  filePickerError = "",
  showReviewTable,
  onAddFiles,
  onRemoveFile,
  onReplaceFile,
  partialAssessmentNotice,
  fileRequirementsUrl = RVTOOLS_FILE_REQUIREMENTS_URL,
  maxFiles = MAX_RVTOOLS_FILES,
  fieldId = "rvtools-files",
  introText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const [isStagedFilesExpanded, setIsStagedFilesExpanded] = useState(true);

  const showStagedList = stagedFiles.length > 0 && !showReviewTable;
  const showDropzone = !showReviewTable;

  const openFilePicker = (): void => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const list = event.target.files;
    if (list?.length) {
      onAddFiles(Array.from(list));
    }
    event.target.value = "";
  };

  const onDropzoneDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDropzoneDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    if (isDisabled) {
      return;
    }
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      onAddFiles(files);
    }
  };

  const onReplaceSelected = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    const targetId = replaceTargetIdRef.current;
    if (file && targetId) {
      onReplaceFile(targetId, file);
    }
    replaceTargetIdRef.current = null;
    event.target.value = "";
  };

  const triggerReplace = (stagedId: string): void => {
    replaceTargetIdRef.current = stagedId;
    replaceInputRef.current?.click();
  };

  const isRowActionDisabled = (staged: RvtoolsStagedFile): boolean => {
    if (!isDisabled) {
      return false;
    }
    if (!showReviewTable) {
      return true;
    }
    return staged.status === "processing" || staged.status === "staging";
  };

  const defaultIntro = (
    <>
      Select one or more Excel files from RVTools. Multiple files are merged
      into one assessment. An assessment will be created from files that process
      successfully. Files with errors will be excluded.
      <br />
      <a href={fileRequirementsUrl} target="_blank" rel="noopener noreferrer">
        RVTools file requirements
      </a>
    </>
  );

  const recoveryIntro = (
    <>
      Replace files with errors or remove them from this batch. Cancel to start
      a new upload.
      <br />
      <a href={fileRequirementsUrl} target="_blank" rel="noopener noreferrer">
        RVTools file requirements
      </a>
    </>
  );

  const appendIntro = (
    <>
      Upload additional RVTools exports to include in this assessment. Files
      that process successfully will be added to this assessment and its results
      will be updated. Files with errors will be excluded.
      {maxFiles < MAX_RVTOOLS_FILES ? (
        <>
          {" "}
          You can add up to {maxFiles} more file{maxFiles === 1 ? "" : "s"}.
        </>
      ) : null}
    </>
  );

  return (
    <FormGroup
      label={mode === "append" ? "RVTools files" : "RVTools files (Excel)"}
      isRequired
      fieldId={fieldId}
    >
      {partialAssessmentNotice}

      <div className={dropzoneIntroStyle}>
        {showReviewTable
          ? recoveryIntro
          : (introText ?? (mode === "append" ? appendIntro : defaultIntro))}
      </div>

      {showDropzone ? (
        <section
          className={dropzoneStyle}
          aria-label="RVTools file drop zone"
          onDragOver={onDropzoneDragOver}
          onDrop={onDropzoneDrop}
        >
          <RhUiUploadIcon />
          <div className={dropzoneTextStyle}>
            <div>Drag and drop files here or</div>
            <div>Accepted file types: XLSX, XLS. Up to {maxFiles} files.</div>
          </div>
          <Button
            variant="secondary"
            onClick={openFilePicker}
            isDisabled={isDisabled || stagedFiles.length >= maxFiles}
          >
            Select files
          </Button>
          <input
            ref={fileInputRef}
            className={hiddenInputStyle}
            type="file"
            accept={RVTOOLS_ACCEPT}
            multiple
            onChange={onFilesSelected}
            disabled={isDisabled}
          />
        </section>
      ) : null}

      <input
        ref={replaceInputRef}
        className={hiddenInputStyle}
        type="file"
        accept={RVTOOLS_ACCEPT}
        onChange={onReplaceSelected}
        disabled={isDisabled}
      />

      {filePickerError ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem
              variant="error"
              data-testid="upload-field-helper-text"
            >
              {filePickerError}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}

      {showStagedList ? (
        <ExpandableSection
          className={stagedFilesPanelStyle}
          toggleContent={
            <span className={stagedFilesToolbarToggleStyle}>
              <CheckCircleIcon
                className={stagedFilesToolbarIconStyle}
                aria-hidden
              />
              {stagedFiles.length} of {maxFiles} files selected
            </span>
          }
          isExpanded={isStagedFilesExpanded}
          onToggle={(_event, expanded) => {
            setIsStagedFilesExpanded(expanded);
          }}
        >
          <div className={stagedFilesListStyle}>
            {stagedFiles.map((staged) => {
              const isComplete = staged.progress >= 100;
              return (
                <div key={staged.id} className={stagedFileRowStyle}>
                  <div className={stagedFileMetaStyle}>
                    <FileIcon aria-hidden />
                    <span className={stagedFileNameStyle}>
                      <Truncate content={staged.file.name} />
                      <span> {formatRvtoolsFileSize(staged.file.size)}</span>
                    </span>
                  </div>
                  <div className={stagedFileActionsStyle}>
                    <span className={stagedFilePercentStyle}>
                      {staged.progress}%
                    </span>
                    {isComplete ? (
                      <CheckCircleIcon
                        className={stagedFileCompleteIconStyle}
                        aria-label="Ready"
                      />
                    ) : null}
                    <Button
                      variant="plain"
                      aria-label={`Remove ${staged.file.name}`}
                      onClick={() => onRemoveFile(staged.id)}
                      isDisabled={isDisabled}
                    >
                      <RhUiTrashIcon />
                    </Button>
                  </div>
                  <div className={stagedFileProgressStyle}>
                    <Progress
                      value={staged.progress}
                      aria-label={`Upload progress for ${staged.file.name}`}
                      size={ProgressSize.sm}
                      variant={isComplete ? "success" : undefined}
                      measureLocation={ProgressMeasureLocation.none}
                      hideStatusIcon
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ExpandableSection>
      ) : null}

      {showReviewTable ? (
        <Table
          aria-label="RVTools file validation results"
          variant="compact"
          className={reviewTableStyle}
        >
          <Thead>
            <Tr>
              <Th modifier="fitContent">Status</Th>
              <Th>File</Th>
              <Th modifier="fitContent">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {stagedFiles.map((staged) => (
              <Tr key={staged.id}>
                <Td>
                  {staged.status === "valid" ||
                  (staged.status === "staged" && staged.progress >= 100) ? (
                    <Label color="green" icon={<CheckCircleIcon />}>
                      Ready
                    </Label>
                  ) : staged.status === "invalid" ? (
                    <Label color="red" icon={<ExclamationCircleIcon />}>
                      Invalid
                    </Label>
                  ) : staged.status === "processing" ? (
                    <Label color="blue" icon={<InProgressIcon />}>
                      Processing
                    </Label>
                  ) : staged.status === "queued" ? (
                    <Label color="grey">Waiting</Label>
                  ) : null}
                </Td>
                <Td dataLabel="File">
                  <Truncate content={staged.file.name} />
                  {staged.errorMessage ? (
                    <HelperText>
                      <HelperTextItem variant="error">
                        {staged.errorMessage}
                      </HelperTextItem>
                    </HelperText>
                  ) : null}
                </Td>
                <Td isActionCell>
                  <div className={reviewTableActionsStyle}>
                    {staged.status === "invalid" ? (
                      <Button
                        variant="link"
                        isInline
                        onClick={() => triggerReplace(staged.id)}
                        isDisabled={isRowActionDisabled(staged)}
                      >
                        Replace
                      </Button>
                    ) : null}
                    <Button
                      variant="plain"
                      aria-label={`Delete ${staged.file.name}`}
                      onClick={() => onRemoveFile(staged.id)}
                      isDisabled={isRowActionDisabled(staged)}
                    >
                      <RhUiTrashIcon />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : null}
    </FormGroup>
  );
};

RvtoolsFilesField.displayName = "RvtoolsFilesField";

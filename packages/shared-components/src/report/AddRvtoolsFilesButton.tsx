import {
  Alert,
  Button,
  Content,
  type DropEvent,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatus,
  MultipleFileUploadStatusItem,
} from "@patternfly/react-core";
import { UploadIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useId, useState } from "react";

const ACCEPTED_EXTENSION = ".xlsx";
const ACCEPTED_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const MAX_RVTOOLS_FILES = 50;

export interface AddRvtoolsFilesButtonProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (files: File[]) => void;
  maxFiles?: number;
  isLoading?: boolean;
  isProcessing?: boolean;
  error?: string | null;
  progress?: {
    percentage: number;
    statusText: string;
  } | null;
}

export const AddRvtoolsFilesButton: React.FC<AddRvtoolsFilesButtonProps> = ({
  isOpen,
  onOpen,
  onClose,
  onSubmit,
  maxFiles = MAX_RVTOOLS_FILES,
  isLoading = false,
  isProcessing = false,
  error,
  progress,
}) => {
  const titleId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [fileLimitError, setFileLimitError] = useState<string | null>(null);
  const isBusy = isLoading || isProcessing;

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setFileLimitError(null);
    }
  }, [isOpen]);

  const closeModal = (): void => {
    if (!isBusy) {
      onClose();
    }
  };

  const handleFileDrop = (_event: DropEvent, droppedFiles: File[]): void => {
    setFileLimitError(null);
    const accepted = droppedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION),
    );
    setFiles((current) => {
      const byName = new Map(current.map((file) => [file.name, file]));
      for (const file of accepted) {
        byName.set(file.name, file);
      }
      const merged = Array.from(byName.values());
      if (merged.length > maxFiles) {
        setFileLimitError(`You can add up to ${maxFiles} files.`);
        return merged.slice(0, maxFiles);
      }
      return merged;
    });
  };

  const handleRemoveFile = (name: string): void => {
    if (!isBusy) {
      setFiles((current) => current.filter((file) => file.name !== name));
      setFileLimitError(null);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        icon={<UploadIcon />}
        onClick={onOpen}
        isDisabled={maxFiles < 1 || isBusy}
      >
        Add RVTools files
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        variant="medium"
        aria-labelledby={titleId}
      >
        <ModalHeader title="Add RVTools files" labelId={titleId} />
        <ModalBody>
          <Flex direction={{ default: "column" }} gap={{ default: "gapMd" }}>
            <FlexItem>
              <Content component="p">
                Upload additional RVTools exports to merge their inventory into
                this report. The existing report data will be preserved.
              </Content>
            </FlexItem>

            {fileLimitError ? (
              <FlexItem>
                <Alert variant="warning" isInline title="File limit">
                  {fileLimitError}
                </Alert>
              </FlexItem>
            ) : null}

            {error ? (
              <FlexItem>
                <Alert variant="danger" isInline title="Upload failed">
                  {error}
                </Alert>
              </FlexItem>
            ) : null}

            <FlexItem>
              <MultipleFileUpload
                onFileDrop={handleFileDrop}
                dropzoneProps={{
                  accept: { [ACCEPTED_MIME]: [ACCEPTED_EXTENSION] },
                  disabled: isBusy,
                }}
              >
                <MultipleFileUploadMain
                  titleIcon={<UploadIcon />}
                  titleText="Drag and drop files here"
                  titleTextSeparator="or"
                  infoText={`Accepted file type: .xlsx (up to ${maxFiles} files)`}
                  browseButtonText="Upload"
                />
                {files.length > 0 ? (
                  <MultipleFileUploadStatus
                    statusToggleText={`${files.length} file${
                      files.length === 1 ? "" : "s"
                    } selected`}
                  >
                    {files.map((file) => (
                      <MultipleFileUploadStatusItem
                        key={file.name}
                        file={file}
                        onClearClick={() => handleRemoveFile(file.name)}
                        buttonAriaLabel={`Remove ${file.name}`}
                      />
                    ))}
                  </MultipleFileUploadStatus>
                ) : null}
              </MultipleFileUpload>
            </FlexItem>

            {progress ? (
              <FlexItem>
                <Content component="small">
                  {progress.percentage}% done. {progress.statusText}
                </Content>
              </FlexItem>
            ) : null}
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => onSubmit([...files])}
            isLoading={isBusy}
            isDisabled={isBusy || files.length === 0}
          >
            Add RVTools files
          </Button>
          <Button variant="link" onClick={closeModal} isDisabled={isBusy}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

AddRvtoolsFilesButton.displayName = "AddRvtoolsFilesButton";

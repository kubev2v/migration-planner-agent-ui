import { useCallback, useEffect, useMemo, useState } from "react";

import { MAX_RVTOOLS_FILES, RVTOOLS_MAX_FILE_BYTES } from "./constants.js";
import { formatRvtoolsBackendErrorMessage } from "./formatters.js";
import type {
  RvtoolsFilesFieldMode,
  RvtoolsFileValidationResult,
  RvtoolsStagedFile,
} from "./types.js";
import { isAllowedRvtoolsExtension } from "./validation.js";

export type UseRvtoolsFileStagingOptions = {
  mode: RvtoolsFilesFieldMode;
  /** When false, staging progress timer does not run (e.g. modal closed). */
  isActive?: boolean;
  isDisabled?: boolean;
  resumePartialAssessmentId?: string;
  onClearError?: () => void;
  onStagedFileRemoved?: (file: { fileName: string; fileSize: number }) => void;
  onPartialAssessmentResolved?: () => void;
  maxFiles?: number;
  maxFileBytes?: number;
};

export type UseRvtoolsFileStagingResult = {
  stagedFiles: RvtoolsStagedFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  replaceFile: (id: string, file: File) => void;
  applyValidationResults: (results: RvtoolsFileValidationResult[]) => void;
  reset: () => void;
  filePickerError: string;
  validFileCount: number;
  invalidFileCount: number;
  submitableFileCount: number;
  showReviewTable: boolean;
  getFilesForSubmit: () => File[];
};

const newStagedId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `staged-${Date.now()}-${Math.random()}`;

const STAGING_PROGRESS_STEP = 25;
const STAGING_PROGRESS_INTERVAL_MS = 120;

const matchesValidationResult = (
  file: File,
  result: RvtoolsFileValidationResult,
): boolean => file.name === result.fileName && file.size === result.fileSize;

const isReadyForRecoverySubmit = (entry: RvtoolsStagedFile): boolean =>
  entry.status === "valid" ||
  (entry.status === "staged" && entry.progress >= 100);

export function useRvtoolsFileStaging({
  mode,
  isActive = true,
  isDisabled = false,
  resumePartialAssessmentId,
  onClearError,
  onStagedFileRemoved,
  onPartialAssessmentResolved,
  maxFiles = MAX_RVTOOLS_FILES,
  maxFileBytes = RVTOOLS_MAX_FILE_BYTES,
}: UseRvtoolsFileStagingOptions): UseRvtoolsFileStagingResult {
  const isResumingPartialCreate = Boolean(
    mode === "create" && resumePartialAssessmentId,
  );
  const [stagedFiles, setStagedFiles] = useState<RvtoolsStagedFile[]>([]);
  const [filePickerError, setFilePickerError] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  const reset = useCallback((): void => {
    setStagedFiles([]);
    setFilePickerError("");
    setRecoveryMode(false);
  }, []);

  useEffect(() => {
    if (!isActive) {
      reset();
    }
  }, [isActive, reset]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setStagedFiles((current) => {
        let changed = false;
        const next: RvtoolsStagedFile[] = current.map((entry) => {
          if (entry.status !== "staging") {
            return entry;
          }
          changed = true;
          const nextProgress = Math.min(
            100,
            entry.progress + STAGING_PROGRESS_STEP,
          );
          if (nextProgress >= 100) {
            return {
              ...entry,
              progress: 100,
              status: "staged",
            };
          }
          return { ...entry, progress: nextProgress };
        });
        return changed ? next : current;
      });
    }, STAGING_PROGRESS_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isActive]);

  const addFiles = useCallback(
    (files: File[]): void => {
      if (isDisabled) {
        return;
      }

      onClearError?.();
      setFilePickerError("");

      const remainingSlots = maxFiles - stagedFiles.length;
      if (remainingSlots <= 0) {
        setFilePickerError(`You can upload up to ${maxFiles} files.`);
        return;
      }

      const accepted = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        setFilePickerError(
          `Only ${remainingSlots} more file${remainingSlots === 1 ? "" : "s"} can be added (maximum ${maxFiles}).`,
        );
      }

      const newEntries: RvtoolsStagedFile[] = [];

      for (const file of accepted) {
        if (!isAllowedRvtoolsExtension(file.name)) {
          setFilePickerError(
            "Unsupported file format. Please select XLSX or XLS files.",
          );
          continue;
        }
        if (file.size > maxFileBytes) {
          setFilePickerError(
            "The file is too big. Select a file up to 50 MiB.",
          );
          continue;
        }
        if (
          stagedFiles.some(
            (staged) =>
              staged.file.name === file.name && staged.file.size === file.size,
          )
        ) {
          continue;
        }
        newEntries.push({
          id: newStagedId(),
          file,
          status: "staging",
          progress: 0,
        });
      }

      if (newEntries.length > 0) {
        setStagedFiles((current) => [...current, ...newEntries]);
      }
    },
    [isDisabled, maxFileBytes, maxFiles, onClearError, stagedFiles],
  );

  const removeFile = useCallback(
    (id: string, options?: { fromReplace?: boolean }): void => {
      const removed = stagedFiles.find((entry) => entry.id === id);
      let next = stagedFiles.filter((entry) => entry.id !== id);
      if (removed) {
        onStagedFileRemoved?.({
          fileName: removed.file.name,
          fileSize: removed.file.size,
        });
      }

      if (next.length === 0) {
        reset();
        return;
      }

      const hasInvalidRemaining = next.some(
        (entry) => entry.status === "invalid",
      );

      const shouldResolvePartialAssessment =
        !options?.fromReplace &&
        isResumingPartialCreate &&
        removed?.status === "invalid" &&
        !hasInvalidRemaining &&
        !next.some(
          (entry) => entry.status === "staged" || entry.status === "staging",
        );

      if (shouldResolvePartialAssessment) {
        setFilePickerError("");
        reset();
        onPartialAssessmentResolved?.();
        return;
      }

      if (!hasInvalidRemaining) {
        onClearError?.();
        setRecoveryMode(false);
        if (!options?.fromReplace) {
          next = next.map((entry) =>
            entry.status === "valid"
              ? {
                  ...entry,
                  status: "staged" as const,
                  errorMessage: undefined,
                }
              : entry,
          );
        }
      }

      setStagedFiles(next);
      setFilePickerError("");
    },
    [
      isResumingPartialCreate,
      onClearError,
      onPartialAssessmentResolved,
      onStagedFileRemoved,
      reset,
      stagedFiles,
    ],
  );

  const replaceFile = useCallback(
    (id: string, file: File): void => {
      removeFile(id, { fromReplace: true });
      addFiles([file]);
    },
    [addFiles, removeFile],
  );

  const applyValidationResults = useCallback(
    (results: RvtoolsFileValidationResult[]): void => {
      const hasInvalid = results.some((entry) => entry.status === "invalid");
      if (hasInvalid) {
        setRecoveryMode(true);
      }

      setStagedFiles((current) =>
        current.map((entry) => {
          const result = results.find((item) =>
            matchesValidationResult(entry.file, item),
          );
          if (!result) {
            return entry;
          }
          if (result.status === "valid") {
            return {
              ...entry,
              status: "valid",
              progress: 100,
              errorMessage: undefined,
            };
          }
          if (result.status === "invalid") {
            return {
              ...entry,
              status: "invalid",
              progress: 100,
              errorMessage: result.errorMessage
                ? formatRvtoolsBackendErrorMessage(result.errorMessage)
                : undefined,
            };
          }
          if (result.status === "processing") {
            return {
              ...entry,
              status: "processing",
              progress: 50,
              errorMessage: undefined,
            };
          }
          if (result.status === "pending") {
            return {
              ...entry,
              status: "queued",
              progress: 0,
              errorMessage: undefined,
            };
          }
          return entry;
        }),
      );
    },
    [],
  );

  const invalidFileCount = useMemo(
    () => stagedFiles.filter((entry) => entry.status === "invalid").length,
    [stagedFiles],
  );

  const showReviewTable = recoveryMode && stagedFiles.length > 0;

  const validFileCount = useMemo(
    () =>
      showReviewTable
        ? stagedFiles.filter(isReadyForRecoverySubmit).length
        : stagedFiles.filter((entry) => entry.status === "valid").length,
    [showReviewTable, stagedFiles],
  );

  const submitableFiles = useMemo(
    () =>
      stagedFiles.filter((entry) => {
        if (
          entry.status === "invalid" ||
          entry.status === "processing" ||
          entry.status === "queued" ||
          entry.status === "staging"
        ) {
          return false;
        }
        if (showReviewTable) {
          return isReadyForRecoverySubmit(entry);
        }
        if (isResumingPartialCreate) {
          return entry.status === "staged";
        }
        return entry.status === "staged" || entry.status === "valid";
      }),
    [isResumingPartialCreate, showReviewTable, stagedFiles],
  );

  const getFilesForSubmit = useCallback(
    (): File[] => submitableFiles.map((entry) => entry.file),
    [submitableFiles],
  );

  return {
    stagedFiles,
    addFiles,
    removeFile,
    replaceFile,
    applyValidationResults,
    reset,
    filePickerError,
    validFileCount,
    invalidFileCount,
    submitableFileCount: submitableFiles.length,
    showReviewTable,
    getFilesForSubmit,
  };
}

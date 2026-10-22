export type RvtoolsStagedFileStatus =
  | "staging"
  | "staged"
  | "valid"
  | "invalid";

export type RvtoolsStagedFile = {
  id: string;
  file: File;
  status: RvtoolsStagedFileStatus;
  /** Client-side staging progress (0–100). */
  progress: number;
  errorMessage?: string;
};

export type RvtoolsFileValidationStatus =
  | "pending"
  | "processing"
  | "valid"
  | "invalid";

export type RvtoolsFileValidationResult = {
  fileName: string;
  fileSize: number;
  status: RvtoolsFileValidationStatus;
  errorMessage?: string;
};

export type RvtoolsFilesFieldMode = "create" | "append";

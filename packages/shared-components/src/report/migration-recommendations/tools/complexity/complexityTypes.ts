import type { SchemaEstimationResultLike } from "../time-estimation/migrationEstimationResponseLike.js";

export type { SchemaEstimationResultLike };

export interface ComplexityOSNameEntryLike {
  osName: string;
  score: number;
  vmCount: number;
}

export interface ComplexityDiskScoreEntryLike {
  score: number;
  vmCount: number;
}

export interface OsDiskEstimationEntryLike {
  score: number;
  vmCount: number;
  totalDiskSizeTB: number;
  estimation?: Record<string, SchemaEstimationResultLike>;
}

export interface MigrationComplexityResponseLike {
  complexityByOSName: ComplexityOSNameEntryLike[];
  complexityByDisk: ComplexityDiskScoreEntryLike[];
}

export interface MigrationEstimationByComplexityResponseLike {
  complexityByOsDisk: OsDiskEstimationEntryLike[];
}

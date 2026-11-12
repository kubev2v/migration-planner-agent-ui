export interface EstimationDetailLike {
  duration?: string;
  minDuration?: string;
  maxDuration?: string;
  reason: string;
}

export interface SchemaEstimationResultLike {
  minTotalDuration: string;
  maxTotalDuration: string;
  breakdown?: Record<string, EstimationDetailLike>;
}

export interface MigrationEstimationResponseLike {
  estimation: Record<string, SchemaEstimationResultLike>;
}

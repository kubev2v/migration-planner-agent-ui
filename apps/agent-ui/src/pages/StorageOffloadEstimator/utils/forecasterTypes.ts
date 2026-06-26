// Types for the Storage Offload Estimator / Forecaster API
// Base URL: /api/v1/forecaster
// Kept in sync with api/v1/openapi.yaml (ForecasterStartRequest, DatastoreDetail, etc.)

export interface ForecasterCredentials {
  url: string;
  username: string;
  password: string;
}

export interface ForecasterDatastore {
  name: string;
  type: string;
  capacityGb: number;
  freeGb: number;
  storageVendor?: string;
  storageModel?: string;
  /** Derived from NAA device ID prefix. Same value = same physical array. Absent for NFS/local. */
  storageArrayId?: string;
  naaDevices?: string[];
  capabilities?: string[];
}

/** POST /forecaster/datastores request body — credentials are optional. */
export interface ForecasterDatastoresRequest {
  credentials?: ForecasterCredentials;
}

export interface ForecastStartPair {
  name: string;
  sourceDatastore: string;
  targetDatastore: string;
  /** Optional ESXi host. Agent auto-selects a common host if omitted. */
  host?: string;
}

export interface ForecastStartRequest {
  /** vCenter credentials. Optional if previously provided in an earlier request. */
  credentials?: ForecasterCredentials;
  pairs: ForecastStartPair[];
  diskSizeGb?: number;
  iterations?: number;
  concurrency?: number;
}

export interface ForecastPairStatus {
  pairName: string;
  sourceDatastore: string;
  targetDatastore: string;
  /** ESXi host selected for this pair (user-specified or auto-selected). */
  host?: string;
  state:
    | "pending"
    | "preparing"
    | "running"
    | "completed"
    | "canceled"
    | "error";
  error?: string;
  completedRuns: number;
  totalRuns: number;
  prepBytesTotal?: number;
  prepBytesUploaded?: number;
}

export interface ForecasterStatus {
  /** Top-level state: "ready" (idle) or "running" (benchmark in progress).
   *  When a benchmark finishes or is canceled, state returns to "ready". */
  state: "ready" | "running";
  /** Per-pair progress (present only when running). */
  pairs?: ForecastPairStatus[];
}

export interface ForecastRun {
  id: number;
  sessionId: number;
  pairName: string;
  sourceDatastore: string;
  targetDatastore: string;
  iteration: number;
  diskSizeGb: number;
  /** Time spent on disk creation and random fill (iteration 1 only). */
  prepDurationSec?: number;
  durationSec: number;
  throughputMbps: number;
  method?: string;
  error?: string;
  createdAt: string;
}

export interface EstimateRange {
  bestCase?: string;
  expected?: string;
  worstCase?: string;
}

export interface ForecastStats {
  pairName: string;
  sampleCount: number;
  meanMbps?: number;
  medianMbps?: number;
  minMbps?: number;
  maxMbps?: number;
  stddevMbps?: number;
  ci95LowerMbps?: number;
  ci95UpperMbps?: number;
  estimatePer1TB?: EstimateRange;
}

export interface PairCapabilityRequest {
  pairs: ForecastStartPair[];
}

export interface PairCapability {
  pairName: string;
  sourceDatastore: string;
  targetDatastore: string;
  /** Feasible offload methods: "xcopy" | "copy-offload" | "rdm" | "vvol" */
  capabilities: string[];
}

// UI types for pair selection
export interface DatastoreGroup {
  storageArrayId: string;
  storageVendor?: string;
  storageModel?: string;
  datastores: ForecasterDatastore[];
}

export interface SelectedPair {
  id: string;
  name: string;
  sourceDatastore: string;
  targetDatastore: string;
}

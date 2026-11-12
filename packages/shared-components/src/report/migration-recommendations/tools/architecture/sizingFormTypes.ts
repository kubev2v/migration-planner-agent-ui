export type WorkerNodePreset = "small" | "medium" | "large" | "custom";

export type OvercommitRatio = 1 | 2 | 4 | 6 | 8;

export type MemoryOvercommitRatio = 1 | 2 | 4;

export type HAReplicaCount = 1 | 2 | 3;

export type ClusterMode =
  | "full-ha"
  | "compact"
  | "single-node"
  | "hosted-control-plane";

export const isControlPlaneOnlyClusterMode = (mode: ClusterMode): boolean =>
  mode === "single-node" || mode === "compact";

export interface WorkloadFormValues {
  totalVMs: number;
  totalCPU: number;
  totalMemory: number;
}

export interface SizingFormValues {
  clusterMode: ClusterMode;
  workerNodePreset: WorkerNodePreset;
  customCpu: number;
  customMemoryGb: number;
  haReplicas: HAReplicaCount;
  cpuOvercommitRatio: OvercommitRatio;
  memoryOvercommitRatio: MemoryOvercommitRatio;
  scheduleOnControlPlane: boolean;
  smtEnabled: boolean;
  smtThreads: number;
  controlPlaneCpu: number;
  controlPlaneMemoryGb: number;
}

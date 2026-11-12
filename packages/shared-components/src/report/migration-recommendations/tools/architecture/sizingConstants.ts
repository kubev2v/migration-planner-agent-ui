import type {
  ClusterMode,
  HAReplicaCount,
  MemoryOvercommitRatio,
  OvercommitRatio,
  SizingFormValues,
  WorkerNodePreset,
  WorkloadFormValues,
} from "./sizingFormTypes.js";

export const SMT_THREADS_MIN = 2;
export const SMT_THREADS_MAX = 2000;

export const WORKER_NODE_PRESETS: Record<
  Exclude<WorkerNodePreset, "custom">,
  { cpu: number; memoryGb: number; label: string; description: string }
> = {
  small: {
    cpu: 16,
    memoryGb: 64,
    label: "Small (16 CPU / 64 GB)",
    description: "Suitable for lightweight workloads",
  },
  medium: {
    cpu: 64,
    memoryGb: 256,
    label: "Medium (64 CPU / 256 GB)",
    description: "Balanced for general purpose workloads",
  },
  large: {
    cpu: 200,
    memoryGb: 512,
    label: "Large (200 CPU / 512 GB)",
    description: "For demanding, resource-intensive workloads",
  },
};

export const CPU_OPTIONS: { value: number; label: string }[] = [
  { value: 16, label: "16" },
  { value: 32, label: "32" },
  { value: 64, label: "64" },
  { value: 128, label: "128" },
  { value: 200, label: "200" },
  { value: 384, label: "384" },
];

export const MEMORY_OPTIONS: { value: number; label: string }[] = [
  { value: 32, label: "32" },
  { value: 64, label: "64" },
  { value: 128, label: "128" },
  { value: 256, label: "256" },
  { value: 512, label: "512" },
  { value: 1024, label: "1024" },
  { value: 2048, label: "2048" },
  { value: 4096, label: "4096" },
];

export const CONTROL_PLANE_CPU_OPTIONS: { value: number; label: string }[] = [
  { value: 6, label: "6" },
  { value: 16, label: "16" },
  { value: 32, label: "32" },
  { value: 64, label: "64" },
  { value: 128, label: "128" },
  { value: 200, label: "200" },
  { value: 384, label: "384" },
];

export const CONTROL_PLANE_MEMORY_OPTIONS: { value: number; label: string }[] =
  [
    { value: 16, label: "16" },
    { value: 32, label: "32" },
    { value: 64, label: "64" },
    { value: 128, label: "128" },
    { value: 256, label: "256" },
    { value: 512, label: "512" },
    { value: 1024, label: "1024" },
    { value: 2048, label: "2048" },
    { value: 4096, label: "4096" },
  ];

export const CPU_OVERCOMMIT_OPTIONS: {
  value: OvercommitRatio;
  label: string;
  description: string;
  helpText: string;
}[] = [
  {
    value: 1,
    label: "Performance (1:1)",
    description: "No sharing. Dedicated power for every VM.",
    helpText: "Best for latency-sensitive or critical workloads.",
  },
  {
    value: 2,
    label: "Balanced (1:2)",
    description: "Light sharing. Safe for critical apps.",
    helpText: "Good balance between cost and performance.",
  },
  {
    value: 4,
    label: "Standard (1:4)",
    description: "Moderate sharing. Best for general use.",
    helpText:
      'Example: At 1:4, you can run 400 "virtual" CPUs on 100 "physical" cores.',
  },
  {
    value: 6,
    label: "High Density (1:6)",
    description: "Heavy sharing. Good savings for test environments.",
    helpText: "Only recommended for non-production workloads.",
  },
  {
    value: 8,
    label: "Maximum Density (1:8)",
    description: "Extreme sharing. Lowest infrastructure cost.",
    helpText:
      'Example: At 1:8, you can run 800 "virtual" CPUs on 100 "physical" cores. Only for non-production workloads.',
  },
];

export const MEMORY_OVERCOMMIT_OPTIONS: {
  value: MemoryOvercommitRatio;
  label: string;
  description: string;
  helpText: string;
}[] = [
  {
    value: 1,
    label: "Performance (1:1)",
    description: "No sharing. Dedicated memory for every VM.",
    helpText: "Best for latency-sensitive or critical workloads.",
  },
  {
    value: 2,
    label: "Balanced (1:2)",
    description: "Light sharing. Safe for critical apps.",
    helpText: "Good balance between cost and performance.",
  },
  {
    value: 4,
    label: "Standard (1:4)",
    description: "Moderate sharing. Best for general use.",
    helpText: "Typical choice for general purpose workloads.",
  },
];

export const HA_OPTIONS: {
  value: HAReplicaCount;
  label: string;
  description: string;
  helpText: string;
}[] = [
  {
    value: 1,
    label: "Development",
    description: "Low cost; no protection against crashes.",
    helpText: "Single replica - suitable for development and testing only.",
  },
  {
    value: 2,
    label: "Production",
    description: "Reliable; stays online if one node fails.",
    helpText: "Two replicas provide basic high availability.",
  },
  {
    value: 3,
    label: "Critical",
    description: "Maximum uptime; safe during updates and failures.",
    helpText: "Three replicas ensure availability during maintenance windows.",
  },
];

export const CLUSTER_MODE_OPTIONS: {
  value: ClusterMode;
  label: string;
}[] = [
  { value: "full-ha", label: "Full HA (3CP)" },
  { value: "compact", label: "Compact (3CP)" },
  { value: "single-node", label: "Single node (SNO)" },
  { value: "hosted-control-plane", label: "Hosted control plane (HCP)" },
];

export const CONTROL_PLANE_OPTIONS = {
  yes: {
    label: "Yes",
    description:
      "Lower cost. Uses spare capacity on management nodes for your VMs.",
  },
  no: {
    label: "No",
    description:
      "Higher stability. Keeps cluster management isolated from your app workloads.",
  },
};

export const DEFAULT_WORKLOAD_FORM_VALUES: WorkloadFormValues = {
  totalVMs: 100,
  totalCPU: 400,
  totalMemory: 1024,
};

export const DEFAULT_FORM_VALUES: SizingFormValues = {
  clusterMode: "full-ha",
  workerNodePreset: "custom",
  customCpu: 32,
  customMemoryGb: 32,
  haReplicas: 3,
  cpuOvercommitRatio: 4,
  memoryOvercommitRatio: 4,
  scheduleOnControlPlane: false,
  smtEnabled: false,
  smtThreads: 32,
  controlPlaneCpu: 16,
  controlPlaneMemoryGb: 32,
};

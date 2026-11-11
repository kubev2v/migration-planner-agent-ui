import {
  CPU_OVERCOMMIT_OPTIONS,
  MEMORY_OVERCOMMIT_OPTIONS,
} from "./sizingConstants.js";

export const formatNumber = (value: number): string => value.toLocaleString();

export const formatRatio = (value: number): string => value.toFixed(2);

export const getCpuOvercommitLabel = (ratio: number): string => {
  const option = CPU_OVERCOMMIT_OPTIONS.find((opt) => opt.value === ratio);
  return option?.label || `1:${ratio}`;
};

export const getMemoryOvercommitLabel = (ratio: number): string => {
  const option = MEMORY_OVERCOMMIT_OPTIONS.find((opt) => opt.value === ratio);
  return option?.label || `1:${ratio}`;
};

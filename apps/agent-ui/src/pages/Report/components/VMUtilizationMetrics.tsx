interface VMUtilizationMetricsProps {
  cpu?: number;
  disk?: number;
  ram?: number;
}

const formatMetric = (value?: number): string => {
  if (value === undefined || value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
};

export const VMUtilizationMetrics = ({
  cpu,
  disk,
  ram,
}: VMUtilizationMetricsProps) => (
  <>
    CPU: <b>{formatMetric(cpu)}</b> | Disk: <b>{formatMetric(disk)}</b> | RAM:{" "}
    <b>{formatMetric(ram)}</b>
  </>
);

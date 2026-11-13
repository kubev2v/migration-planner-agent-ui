import type { EstimationFormValues } from "@openshift-migration-advisor/shared-components";

export function estimationFormToParams(
  values: EstimationFormValues,
): Record<string, number> {
  return {
    transfer_rate_mbps: values.transferRateMbps,
    work_hours_per_day: values.workHoursPerDay,
    troubleshoot_mins_per_vm: values.troubleshootMinsPerVm,
    post_migration_engineers: values.postMigrationEngineers,
  };
}

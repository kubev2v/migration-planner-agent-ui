import type { EstimationFormValues } from "./timeEstimationFormTypes.js";

export const DEFAULT_ESTIMATION_FORM_VALUES: EstimationFormValues = {
  transferRateMbps: 620,
  workHoursPerDay: 8,
  troubleshootMinsPerVm: 60,
  postMigrationEngineers: 10,
};

export const ESTIMATION_SLIDER_LIMITS = {
  transferRateMbps: { min: 0.1, max: 10_000, step: 0.1 },
  workHoursPerDay: { min: 0.5, max: 24, step: 0.5 },
  troubleshootMinsPerVm: { min: 1, max: 180, step: 1 },
  postMigrationEngineers: { min: 1, max: 50, step: 1 },
} as const;

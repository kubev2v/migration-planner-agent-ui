import * as yup from "yup";

export const MAX_LABEL_LENGTH = 100;

export const labelSchema = yup
  .string()
  .trim()
  .default("")
  .max(
    MAX_LABEL_LENGTH,
    `Label exceeds the maximum length of ${MAX_LABEL_LENGTH} characters.`,
  );

/**
 * Validates a single label value against {@link labelSchema}.
 * Returns the error message when invalid, or `null` when valid.
 */
export const validateLabel = (value: string): string | null => {
  try {
    labelSchema.validateSync(value);
    return null;
  } catch (err) {
    return err instanceof yup.ValidationError ? err.message : "Invalid label.";
  }
};

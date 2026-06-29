import { FormGroup, TextArea, ValidatedOptions } from "@patternfly/react-core";
import { type FieldError, useFormContext } from "react-hook-form";

import FormFieldHelperText from "./FormFieldHelperText";
import type { FormGroupProps } from "./types";

export default function TextAreaFormGroup({
  id,
  label,
  name,
  isRequired = false,
  isDisabled = false,
  placeholder = "",
  helpText,
  ...props
}: FormGroupProps) {
  const methods = useFormContext();
  const error = methods.formState.errors[name] as FieldError | undefined;
  const isTouched = methods.formState.touchedFields[name] as
    | boolean
    | undefined;
  const isSubmitted = methods.formState.isSubmitted;
  const showError = error && (isTouched || isSubmitted);

  return (
    <FormGroup label={label} isRequired={isRequired} fieldId={id} {...props}>
      <TextArea
        id={id}
        placeholder={placeholder}
        isRequired={isRequired}
        isDisabled={isDisabled}
        validated={
          showError ? ValidatedOptions.error : ValidatedOptions.default
        }
        {...methods.register(name)}
      />
      <FormFieldHelperText
        helpText={helpText}
        errorMessage={showError ? error?.message : undefined}
      />
    </FormGroup>
  );
}

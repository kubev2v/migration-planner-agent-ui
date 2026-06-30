import { FormGroup, Radio } from "@patternfly/react-core";
import { Controller, type FieldError, useFormContext } from "react-hook-form";

import FormFieldHelperText from "./FormFieldHelperText";
import type { FormGroupProps } from "./types";

interface RadioOption {
  value: string;
  label: string;
  id: string;
}

interface RadioButtonFormGroupProps
  extends Omit<FormGroupProps, "placeholder"> {
  options: RadioOption[];
}

export default function RadioButtonFormGroup({
  id,
  label,
  name,
  isRequired = false,
  options,
  helpText,
  ...props
}: RadioButtonFormGroupProps) {
  const methods = useFormContext();
  const error = methods.formState.errors[name] as FieldError | undefined;
  const isTouched = methods.formState.touchedFields[name] as
    | boolean
    | undefined;
  const isSubmitted = methods.formState.isSubmitted;
  const showError = error && (isTouched || isSubmitted);

  return (
    <FormGroup label={label} isRequired={isRequired} fieldId={id} {...props}>
      <Controller
        name={name}
        control={methods.control}
        render={({ field }) => (
          <div style={{ display: "flex", gap: "16px" }} role="radiogroup">
            {options.map((option) => (
              <Radio
                key={option.value}
                id={option.id}
                name={name}
                label={option.label}
                isChecked={field.value === option.value}
                onChange={() => field.onChange(option.value)}
                onBlur={field.onBlur}
              />
            ))}
          </div>
        )}
      />
      <FormFieldHelperText
        helpText={helpText}
        errorMessage={showError ? error?.message : undefined}
      />
    </FormGroup>
  );
}

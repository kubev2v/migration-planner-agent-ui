import {
  FormGroup,
  FormSelect,
  FormSelectOption,
} from "@patternfly/react-core";
import { Controller, type FieldError, useFormContext } from "react-hook-form";

import FormFieldHelperText from "./FormFieldHelperText";
import type { FormGroupProps } from "./types";

export default function SelectFormGroup({
  id,
  label,
  name,
  isRequired = false,
  options,
  helpText,
  isDisabled = false,
  ...props
}: {
  options: {
    label: string;
    value: string;
  }[];
} & FormGroupProps) {
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
          <FormSelect id={id} isDisabled={isDisabled} {...field}>
            {options.map((option) => (
              <FormSelectOption
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </FormSelect>
        )}
      />
      <FormFieldHelperText
        helpText={helpText}
        errorMessage={showError ? error?.message : undefined}
      />
    </FormGroup>
  );
}
